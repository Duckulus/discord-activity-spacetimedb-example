use crate::Sign::{Circle, Cross};
use spacetimedb::{Identity, ReducerContext, ScheduleAt, SpacetimeType, Table};
use std::cmp::PartialEq;
use std::time::Duration;

#[spacetimedb::table(name = queue_timer, scheduled(tick_queue))]
pub struct QueueTimer {
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    scheduled_at: ScheduleAt,
}

#[spacetimedb::table(name = player, public)]
pub struct Player {
    #[primary_key]
    identity: Identity,
    name: String,
}

#[derive(SpacetimeType, PartialEq, Copy, Clone)]
enum Sign {
    Cross,
    Circle,
}

#[derive(SpacetimeType, PartialEq, Copy, Clone)]
enum EndState {
    GameWon(Identity),
    PlayerLeft,
}

#[spacetimedb::table(name = game_state, public)]
pub struct GameState {
    #[primary_key]
    #[auto_inc]
    id: u64,
    board: Vec<Option<Sign>>,
    player_cross: Identity,
    player_circle: Identity,
    next_sign: Sign,
    end_state: Option<EndState>,
}

#[spacetimedb::table(name = queue_entity)]
pub struct QueueEntity {
    #[primary_key]
    identity: Identity,
}

#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) -> Result<(), String> {
    log::info!("Initializing");

    ctx.db.queue_timer().try_insert(QueueTimer {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Interval(Duration::from_millis(100).into()),
    })?;
    Ok(())
}

#[spacetimedb::reducer]
pub fn tick_queue(ctx: &ReducerContext, _timer: QueueTimer) {
    if ctx.db.queue_entity().count() >= 2 {
        let players = ctx.db.queue_entity().iter().take(2).collect::<Vec<_>>();
        ctx.db.queue_entity().identity().delete(players[0].identity);
        ctx.db.queue_entity().identity().delete(players[1].identity);
        let board = (0..9).map(|_| None).collect();
        ctx.db.game_state().insert(GameState {
            id: 0,
            board,
            next_sign: Circle,
            player_circle: players[0].identity,
            player_cross: players[1].identity,
            end_state: None,
        });
        log::info!("Created Game");
    }
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) {
    log::info!("Player Connected");
    ctx.db.player().insert(Player {
        identity: ctx.sender,
        name: String::new(),
    });
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    log::info!("Player Disconnected");
    ctx.db.player().identity().delete(ctx.sender);
    ctx.db.queue_entity().identity().delete(ctx.sender);
    for mut game in ctx.db.game_state().iter() {
        if game.player_circle == ctx.sender || game.player_cross == ctx.sender {
            game.end_state = Some(EndState::PlayerLeft);
            ctx.db.game_state().id().update(game);
        }
    }
}

#[spacetimedb::reducer]
pub fn set_name(ctx: &ReducerContext, name: String) {
    log::info!("{}", name);
    let player = ctx.db.player().identity().find(ctx.sender).unwrap();
    ctx.db.player().identity().update(Player { name, ..player });
}

#[spacetimedb::reducer]
pub fn search_game(ctx: &ReducerContext) {
    if !ctx.db.queue_entity().identity().find(ctx.sender).is_some() {
        ctx.db.queue_entity().insert(QueueEntity {
            identity: ctx.sender,
        });
    }
}

#[spacetimedb::reducer]
pub fn place_sign(ctx: &ReducerContext, game_id: u64, index: u8) -> Result<(), String> {
    let mut game = ctx
        .db
        .game_state()
        .id()
        .find(game_id)
        .ok_or::<String>("Invalid game_id".into())?;

    if game.end_state.is_some() {
        return Err("Game already ended".into());
    }

    if game.player_circle != ctx.sender && game.player_cross != ctx.sender {
        return Err("You're not part of this game".into());
    }
    let player_sign = if game.player_circle == ctx.sender {
        Circle
    } else {
        Cross
    };
    if game.next_sign != player_sign {
        return Err("It's not your turn".into());
    }
    let index = index as usize;
    if game.board[index].is_some() {
        return Err("Spot already taken".into());
    }
    game.board[index] = Some(player_sign);
    game.next_sign = if player_sign == Circle { Cross } else { Circle };
    let winner = check_winner(&game.board);
    if winner.is_some() {
        game.end_state = Some(EndState::GameWon(match winner.unwrap() {
            Cross => game.player_cross,
            Circle => game.player_circle,
        }));
    }
    ctx.db.game_state().id().update(game);
    Ok(())
}

fn check_winner(board: &Vec<Option<Sign>>) -> Option<Sign> {
    const WIN_LINES: [[usize; 3]; 8] = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];

    for line in &WIN_LINES {
        let a = board[line[0]];
        let b = board[line[1]];
        let c = board[line[2]];

        if a == b && b == c && a.is_some() {
            return a;
        }
    }
    None
}
