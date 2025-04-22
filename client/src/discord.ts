import {DiscordSDK} from "@discord/embedded-app-sdk";
import {initGame} from "./game.ts";
import {DiscordSDKAuth} from "./types.ts";

const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID)

let auth: DiscordSDKAuth;

export function initDiscord() {
    setupDiscordSdk().then(() => {
        console.log(`Discord SDK authenticated as ${auth.user.username}`)
        initGame(auth.user.username);
    });
}

async function setupDiscordSdk() {
    await discordSdk.ready();
    console.log("Discord SDK is ready");

    const {code} = await discordSdk.commands.authorize({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: [
            "identify",
            "guilds",
            "applications.commands"
        ]
    });

    const response = await fetch("/.proxy/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            code
        })
    });
    const {access_token} = await response.json();

    auth = await discordSdk.commands.authenticate({access_token});

    if (auth == null) {
        throw new Error("Authenticate command failed");
    }
}