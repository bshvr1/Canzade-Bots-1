export interface ILimit {
	start: number;
	count: number;
}

export interface IRoleQueue {
	userID: string;
	roleIDs: string[];
	guildID: string;
}

export interface IRolePermissions {
	[roleID: string]: {
		permissions: number;
	};
}

export interface IChannelPermissions {
	[channelID: string]: {
		allow: number;
		deny: number;
		id: string;
	}[];
}
