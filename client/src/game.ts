import './style.css'
import {DbConnection, EventContext, GameState, Player, Sign} from "./module_bindings";
import {Identity} from "@clockworklabs/spacetimedb-sdk";

let conn: DbConnection;
let name: string;

export function initGame(_name: string) {
    conn = DbConnection.builder()
        .withUri(`wss://${import.meta.env.VITE_DISCORD_CLIENT_ID}.discordsays.com/.proxy/db/`)
        .withModuleName("tictactoe")
        .onConnect(onConnect)
        .onDisconnect((_ctx, _err) => console.log("Disconnected"))
        .build();
    name = _name;
}

let identity: Identity;
let gameId: bigint;

function onConnect(conn: DbConnection, _identity: Identity, _token: string) {
    console.log("Connected to SpacetimeDB");
    console.log(`Identity: ${_identity.toHexString()}`)
    identity = _identity;
    conn.reducers.setName(name);

    conn.db.gameState.onInsert(onGameCreate)
    conn.db.gameState.onUpdate(onGameUpdate)
    conn.subscriptionBuilder().onApplied((_ctx) => console.log("Subcribtion Applied")).subscribeToAllTables();
}

function onGameCreate(_ctx: EventContext, row: GameState) {
    if (row.playerCircle.isEqual(identity) || row.playerCross.isEqual(identity)) {
        console.log(`Found Game with id ${row.id}`);
        const opponent = getOpponent(row);
        console.log(`Opponent: ${opponent.name}`)
        gameId = row.id;
        searching_game = false;
        drawGameScreen(row);
    }
}

function getOpponent(game: GameState): Player {
    const oppId = game.playerCross.isEqual(identity) ? game.playerCircle : game.playerCross;
    const opp = conn.db.player.identity.find(oppId);
    return opp!;
}

function onGameUpdate(_ctx: EventContext, _oldRow: GameState, newRow: GameState) {
    if (newRow.id == gameId) {
        console.log("Update detected");
        drawGameScreen(newRow);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    drawHomeScreen();
});

let searching_game = false;

function onSearchGameButtonClick() {
    console.log("Searching game")
    conn.reducers.searchGame();
    searching_game = true;
    drawHomeScreen();
}

function onCellClick(index: number) {
    console.log(`Cell ${index} clicked`);
    conn.reducers.placeSign(gameId, index);
}

function drawHomeScreen() {
    document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <button id="search-game-button" ${searching_game ? "disabled" : ""}>Search Game</button>
    ${searching_game ? "Searching game..." : ""}
  </div>
`
    document.getElementById("search-game-button")!.onclick = onSearchGameButtonClick;
}

function drawGameScreen(state: GameState) {
    const app = document.querySelector<HTMLDivElement>('#app')!;
    app.innerHTML = "";
    let html = "";
    html += `<div class="game-board">`;
    const board = state.board as ((Sign | undefined)[])
    for (let i = 0; i < 9; i++) {
        let sign = board[i] ? (board[i]!.tag == "Circle" ? "O" : "X") : " ";
        html += `<div id="cell-${i}" class="box">${sign}</div>`;
    }
    html += `</div>`;
    app.innerHTML += html;

    if (state.endState) {
        if (state.endState.tag == "PlayerLeft") {
            app.innerHTML+= `<p>Game ended because a player left</p>`
        } else if (state.endState.tag == "GameWon") {
            let winner =conn.db.player.identity.find(state.endState.value)!.name;
            app.innerHTML+= `<p>${winner} won</p>`
        }
        app.innerHTML += `<button id="back-btn">Go Back</button>`
        document.getElementById("back-btn")!.onclick = drawHomeScreen;
    } else {
        if (state.nextSign.tag == "Circle" && state.playerCircle.isEqual(identity)
            ||state.nextSign.tag == "Cross" && state.playerCross.isEqual(identity)) {
            app.innerHTML += `<p>It's your turn</p>`
        } else {
            app.innerHTML += `<p>It's ${getOpponent(state).name}'s turn</p>`
        }
    }

    for(let i = 0; i < 9; i++) {
        document.getElementById(`cell-${i}`)!.onclick = () => {onCellClick(i)};
    }
}


