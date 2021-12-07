import { config } from "dotenv";

config();

export const CONFIG = {
	BOT_TOKEN: process.env.BOT_TOKEN as string,
	BOT_PREFIX: process.env.BOT_PREFIX as string,
	WHITELIST_USERS: (process.env.WHITELIST_USERS as string).split(","),
	BOT_USERS: (process.env.BOT_USERS as string).split(","),
	ADMINS: (process.env.ADMINS as string).split(","),
	VOICE_CHANNEL: process.env.VOICE_CHANNEL as string,
	LIMIT_TIME: 1000 * 60 * 60,
	BOOSTER_ROLE: process.env.BOOSTER_ROLE as string,
	JAIL_ROLE: process.env.JAIL_ROLE as string,
	LOG_CHANNEL: process.env.LOG_CHANNEL as string,
	MONGODB_URI: process.env.MONGODB_URI as string,
};
