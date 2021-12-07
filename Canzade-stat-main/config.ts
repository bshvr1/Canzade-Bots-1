import { config } from "dotenv";

config();

export const CONFIG = {
    BOT_TOKEN: process.env.BOT_TOKEN as string,
    MONGODB_URI: process.env.MONGODB_URI as string,
    REWARD_CHANNEL: process.env.REWARD_CHANNEL as string,
    LEADERBOARDS_CHANNEL: process.env.LEADERBOARDS_CHANNEL as string,
    LEADERBOARDS_MESSAGE_TEXT: process.env.LEADERBOARDS_MESSAGE_TEXT as string,
    LEADERBOARDS_MESSAGE_VOICE: process.env.LEADERBOARDS_MESSAGE_VOICE as string,
    GUILD_ID: process.env.GUILD_ID as string,
    VOICE_REWARDS: [
        {
            rank: 1000 * 60 * 60 * 24 * 4,
            role: "885555131758837834"
        },
        {
            rank: 1000 * 60 * 60 * 24 * 12,
            role: "885555131758837835"
        },
        {
            rank: 1000 * 60 * 60 * 24 * 33,
            role: "885555131758837836"
        },
        {
            rank: 1000 * 60 * 60 * 24 * 83,
            role: "885555131758837837"
        }
    ],
    TEXT_REWARDS: [
        {
            rank: 1000,
            role: "885555131750428701"
        },
        
        {
            rank: 5000,
            role: "885555131758837830"
        },
        {
            rank: 50000,
            role: "885555131758837831"
        },
        {
            rank: 100000,
            role: "885555131758837832"
        }
    ]
}
