import { CONFIG } from "./config";
import {
	Client,
	VoiceChannel,
	Collection,
	User,
	GuildMember,
	GuildChannel,
	MessageEmbed,
	TextChannel,
	Webhook,
	Guild,
} from "discord.js";
import * as pogger from "pogger";
import fetch from "node-fetch";
import { scheduleJob } from "node-schedule";
import { connect } from "mongoose";
import {
	ILimit,
	IRoleQueue,
	IChannelPermissions,
	IRolePermissions,
} from "./types";
import { ChannelModel } from "./channelModel";
import { RoleModel } from "./roleModel";

const limitCollection = new Collection<string, ILimit>();
const roleQueue = new Collection<string, IRoleQueue>();
const client = new Client({
	disableMentions: "all",
	fetchAllMembers: true,
	partials: ["CHANNEL", "GUILD_MEMBER", "CHANNEL", "USER"],
	presence: {
		activity: {
			type: "PLAYING",
			name: "zade kalp can",
		},
	},
	ws: {
		intents: [
			"GUILDS",
			"GUILD_BANS",
			"GUILD_INTEGRATIONS",
			"GUILD_INVITES",
			"GUILD_MEMBERS",
			"GUILD_MESSAGES",
			"GUILD_MESSAGE_REACTIONS",
			"GUILD_MESSAGE_TYPING",
			"GUILD_VOICE_STATES",
			"GUILD_WEBHOOKS",
			"GUILD_EMOJIS",
		],
	},
});

client.on("ready", async () => {
	const voiceChannel = client.channels.cache.get(
		CONFIG.VOICE_CHANNEL,
	) as VoiceChannel;
	if (voiceChannel && voiceChannel.joinable) await voiceChannel.join();
	pogger.success(`[BOT] ${client.user?.tag} giriş yaptı.`);
	scheduleJob("*/1 * * * *", async () => {
		for (let i = 0; i < 5; i++) {
			const data = roleQueue.first();
			if (!data) continue;
			const guild = client.guilds.cache.get(data.guildID);
			if (!guild) continue;
			const member = guild.members.cache.get(data.userID);
			if (!member) continue;
			const roles = data.roleIDs.filter((roleID) =>
				guild.roles.cache.has(roleID),
			);
			await member.roles.add(roles);
			roleQueue.delete(data.userID);
		}
	});
});

client.on("guildMemberRemove", async (member) => {
	if (member.partial) member = await member.fetch();
	const log = await member.guild.fetchAuditLogs({
		limit: 1,
		type: "MEMBER_KICK",
	});
	const entry = log.entries.first();
	if (
		!entry ||
		!entry.executor ||
		entry.executor.equals(client.user as User) ||
		member.guild?.ownerID === entry.executor.id ||
		entry.createdTimestamp - Date.now() > 5000 || CONFIG.BOT_USERS.includes(entry.executor.id)
    ) 
		return;
	const executor = member.guild.member(entry.executor) as GuildMember;
	checkLimit(executor, "Üye atmak.");
});

client.on("guildMemberAdd", async (member) => {
	if (member.user.bot) {
		if (member.partial) member = await member.fetch();
		const log = await member.guild.fetchAuditLogs({
			limit: 1,
			type: "BOT_ADD",
		});
		const entry = log.entries.first();
		pogger.info(
			`${member.user.tag} adlı bot sunucuya ${entry?.executor.tag} tarafından eklendi.`,
		);
		if (
			!entry ||
			!entry.executor ||
			entry.executor.equals(client.user as User) ||
			member.guild?.ownerID === entry.executor.id ||
			entry.createdTimestamp - Date.now() > 5000 || CONFIG.BOT_USERS.includes(entry.executor.id)
    ) 
			return;
		const executor = member.guild.member(entry.executor) as GuildMember;
		checkLimit(executor, "Bot eklemek.");
	}
});

client.on("guildUpdate", async (oldGuild, newGuild) => {
	const log = await newGuild.fetchAuditLogs({
		limit: 1,
		type: "GUILD_UPDATE",
	});
	const entry = log.entries.first();
	if (
		!entry ||
		!entry.executor ||
		entry.executor.equals(client.user as User) ||
		newGuild.ownerID === entry.executor.id ||
		entry.createdTimestamp - Date.now() > 5000 || CONFIG.BOT_USERS.includes(entry.executor.id)
    ) 
		return;
	const executor = newGuild.member(entry.executor) as GuildMember;
	checkLimit(executor, "Sunucuyu düzenlemek.");
	if (oldGuild.publicUpdatesChannelID != newGuild.publicUpdatesChannelID)
		await newGuild.setPublicUpdatesChannel(oldGuild.publicUpdatesChannelID);
	if (oldGuild.afkChannelID != newGuild.afkChannelID)
		await newGuild.setAFKChannel(oldGuild.afkChannelID);
	if (oldGuild.afkTimeout != newGuild.afkTimeout)
		await newGuild.setAFKTimeout(oldGuild.afkTimeout);
	if (oldGuild.rulesChannelID != newGuild.rulesChannelID)
		await newGuild.setRulesChannel(oldGuild.rulesChannelID);
	if (oldGuild.systemChannelID != newGuild.systemChannelID)
		await newGuild.setSystemChannel(oldGuild.systemChannelID);
	if (oldGuild.icon !== newGuild.icon)
		await newGuild.setIcon(oldGuild.iconURL({ dynamic: true }));
	if (oldGuild.banner !== newGuild.banner)
		await newGuild.setBanner(oldGuild.bannerURL());
	if (oldGuild.name !== newGuild.name) await newGuild.setName(oldGuild.name);
	if (oldGuild.vanityURLCode !== newGuild.vanityURLCode)
		await fetch(
			`https://discord.com/api/v8/guilds/${newGuild.id}/vanity-url`,
			{
				method: "PATCH",
				body: JSON.stringify({
					code: oldGuild.vanityURLCode,
				}),
				headers: {
					Authorization: `Bot ${client.token}`,
					"Content-Type": "application/json",
				},
			},
		);
});

client.on("guildBanAdd", async (guild, user) => {
	if (user.partial) user = await user.fetch();
	const log = await guild.fetchAuditLogs({
		limit: 1,
		type: "MEMBER_BAN_ADD",
	});
	const entry = log.entries.first();
	if (
		!entry ||
		!entry.executor ||
		entry.executor.equals(client.user as User) ||
		guild.ownerID === entry.executor.id ||
		entry.createdTimestamp - Date.now() > 5000 || CONFIG.BOT_USERS.includes(entry.executor.id)
		) 
		return;
	const executor = guild.member(entry.executor) as GuildMember;
	await checkLimit(executor, "Üye banlamak.");
	await guild.members.unban(user.id);
});

client.on("channelCreate", async (channel) => {
	if (channel.type === "dm") return;
	const log = await (channel as GuildChannel).guild.fetchAuditLogs({
		limit: 1,
		type: "CHANNEL_CREATE",
	});
	const entry = log.entries.first();
	if (
		!entry ||
		!entry.executor ||
		entry.executor.equals(client.user as User) ||
		(channel as GuildChannel).guild.ownerID === entry.executor.id ||
		entry.createdTimestamp - Date.now() > 5000 || CONFIG.BOT_USERS.includes(entry.executor.id)
		) 
		return;
	const executor = (channel as GuildChannel).guild.member(
		entry.executor,
	) as GuildMember;
	await checkLimit(executor, "Kanal oluşturmak.");
	await channel.delete();
});

client.on("channelUpdate", async (oldChannel, newChannel) => {
	if (newChannel.type === "dm") return;
	const log = await (newChannel as GuildChannel).guild.fetchAuditLogs({
		limit: 1,
		type: "CHANNEL_UPDATE",
	});
	const entry = log.entries.first();
	if (
		!entry ||
		!entry.executor ||
		entry.executor.equals(client.user as User) ||
		(newChannel as GuildChannel).guild.ownerID === entry.executor.id ||
		entry.createdTimestamp - Date.now() > 5000 || CONFIG.BOT_USERS.includes(entry.executor.id)
    ) 
		return;
	const executor = (newChannel as GuildChannel).guild.member(
		entry.executor,
	) as GuildMember;
	await checkLimit(executor, "Kanal güncellemek.");
	(newChannel as GuildChannel).edit({ ...(oldChannel as GuildChannel) });
});

client.on("channelDelete", async (channel) => {
	if (channel.type === "dm") return;
	const log = await (channel as GuildChannel).guild.fetchAuditLogs({
		limit: 1,
		type: "CHANNEL_DELETE",
	});
	const entry = log.entries.first();
	if (
		!entry ||
		!entry.executor ||
		entry.executor.equals(client.user as User) ||
		(channel as GuildChannel).guild.ownerID === entry.executor.id ||
		entry.createdTimestamp - Date.now() > 5000 || CONFIG.BOT_USERS.includes(entry.executor.id)
    ) 
		return;
	const executor = (channel as GuildChannel).guild.member(
		entry.executor,
	) as GuildMember;
	await checkLimit(executor, "Kanal silmek.");
	const newChannel = await (channel as GuildChannel).clone();
	await newChannel.setPosition((channel as GuildChannel).position);
});

client.on("webhookUpdate", async (channel) => {
	const log = await channel.guild.fetchAuditLogs({
		limit: 1,
		type: "WEBHOOK_CREATE",
	});
	const entry = log.entries.first();
	if (
		!entry ||
		!entry.executor ||
		entry.executor.equals(client.user as User) ||
		channel.guild.ownerID === entry.executor.id ||
		entry.createdTimestamp - Date.now() > 5000 || CONFIG.BOT_USERS.includes(entry.executor.id)
		) 
		return;
	const executor = channel.guild.member(entry.executor) as GuildMember;
	await checkLimit(executor, "Webhook oluşturmak.");
	await (entry.target as Webhook).delete();
});

client.on("roleCreate", async (role) => {
	const log = await role.guild.fetchAuditLogs({
		limit: 1,
		type: "ROLE_CREATE",
	});
	const entry = log.entries.first();
	if (
		!entry ||
		!entry.executor ||
		entry.executor.equals(client.user as User) ||
		role.guild.ownerID === entry.executor.id ||
		entry.createdTimestamp - Date.now() > 5000 || CONFIG.BOT_USERS.includes(entry.executor.id)
		) 
		return;
	const executor = role.guild.member(entry.executor) as GuildMember;
	await checkLimit(executor, "Rol oluşturmak.");
	await role.delete();
});

client.on("roleUpdate", async (oldRole, newRole) => {
	const log = await newRole.guild.fetchAuditLogs({
		limit: 1,
		type: "ROLE_UPDATE",
	});
	const entry = log.entries.first();
	if (
		!entry ||
		!entry.executor ||
		entry.executor.equals(client.user as User) ||
		newRole.guild.ownerID === entry.executor.id ||
		entry.createdTimestamp - Date.now() > 5000 || CONFIG.BOT_USERS.includes(entry.executor.id)
    ) 
		return;
	const executor = newRole.guild.member(entry.executor) as GuildMember;
	await checkLimit(executor, "Rol güncellemek.");
	newRole.edit({ ...oldRole });
});


client.on("roleDelete", async (role) => {
	const log = await role.guild.fetchAuditLogs({
		limit: 1,
		type: "ROLE_DELETE",
	});
	const entry = log.entries.first();
	if (
		!entry ||
		!entry.executor ||
		entry.executor.equals(client.user as User) ||
		role.guild.ownerID === entry.executor.id ||
		entry.createdTimestamp - Date.now() > 5000 || CONFIG.BOT_USERS.includes(entry.executor.id)
		) 
		return;
	const executor = role.guild.member(entry.executor) as GuildMember;
	await checkLimit(executor, "Rol silmek.", true);
	const newRole = await role.guild.roles.create({ data: role });
	if (role.members.size)
		role.members.forEach((member) => {
			const roleData = roleQueue.get(member.id);
			if (roleData)
				roleQueue.set(member.id, {
					guildID: role.guild.id,
					userID: member.id,
					roleIDs: [...roleData.roleIDs, newRole.id],
				});
			else
				roleQueue.set(member.id, {
					guildID: role.guild.id,
					userID: member.id,
					roleIDs: [newRole.id],
				});
		});
});

client.on("message", async (message) => {
	if (
		!message.guild ||
		message.author.bot ||
		!message.content ||
		!CONFIG.ADMINS.includes(message.author.id)
	)
		return;
	if (message.content === "!kanal-aç") {
		await message.reply("kanallar açılıyor.");
		await unlockChannels(message.guild);
		await message.reply("kanallar açıldı.");
	}
	if (message.content === "!kanal-kapat") {
		await message.reply("kanallar kapatılıyor.");
		await lockChannels(message.guild);
		await message.reply("kanallar kapatıldı.");
	}

	if (message.content === "!rol-aç") {
		await message.reply("roller açılıyor.");
		await unlockRoles(message.guild);
		await message.reply("roller açıldı.");
	}
	if (message.content === "!rol-kapat") {
		await message.reply("roller kapatılıyor.");
		await lockRoles(message.guild);
		await message.reply("roller kapatıldı.");
	}

});

async function checkLimit(
	executor: GuildMember,
	reason: string,
	isRole?: boolean,
): Promise<void> {
	const whitelisted = CONFIG.WHITELIST_USERS.includes(executor.id);
	if (whitelisted && !isRole) {
		const limit = limitCollection.get(executor.id) as ILimit;
		if (limit) {
			const now = Date.now();
			if (now - limit.start > CONFIG.LIMIT_TIME)
				limitCollection.set(executor.id, {
					count: 1,
					start: Date.now(),
				});
			else {
				limit.count++;
				if (limit.count >= 3 && executor.bannable) {
					await punish(executor, reason);
					limitCollection.delete(executor.id);
				} else limitCollection.set(executor.id, limit);
			}
		} else
			limitCollection.set(executor.id, {
				count: 1,
				start: Date.now(),
			});
	} else punish(executor, reason);
}

async function punish(member: GuildMember, reason: string): Promise<void> {
	if (member.roles.cache.has(CONFIG.BOOSTER_ROLE)) {
		await member.roles.set([CONFIG.JAIL_ROLE, CONFIG.BOOSTER_ROLE]);
		await lockChannels(member.guild);
		await lockRoles(member.guild);
		log(
			member,
			reason,
			`${member.user.tag} bir veya birden çok işlem yaptığı için jaile atıldı.`,
		);
	} else {
		await member.ban({ reason });
		await lockChannels(member.guild);
		await lockRoles(member.guild);
		log(
			member,
			reason,
			`${member.user.tag} bir veya birden çok işlem yaptığı için banlandı.`,
		);
	}
}


async function log(
	member: GuildMember,
	reason: string,
	process: string,
): Promise<void> {
	const logChannel = client.channels.cache.get(
		CONFIG.LOG_CHANNEL,
	) as TextChannel;
	if (logChannel) {
		const embed = new MessageEmbed()
			.setTitle("Guard Log")
			.setDescription(`${member.toString()} cezalandırıldı.`)
			.addField("Uygulanan işlem: ", process)
			.addField("Sebep: ", reason)
			.setTimestamp(Date.now())
			.setFooter("Guard Log");
		await logChannel.send(embed);
		pogger.warning(process);
		pogger.info(`Sebep: ${reason}`);
	}
}

async function lockChannels(guild: Guild): Promise<void> {
	for (const channel of guild.channels.cache.array()) {
		for (const permission of channel.permissionOverwrites.array()) {
			await ChannelModel.updateOne(
				{
					channelID: channel.id,
					dataID: permission.id,
				},
				{
					channelID: channel.id,
					allow: permission.allow.bitfield,
					deny: permission.deny.bitfield,
					type: permission.type,
				},
				{ upsert: true },
			);
			if (channel.manageable)
				await permission.update({
					SEND_MESSAGES: false,


					/*
					ADD_REACTIONS: false,
					ADMINISTRATOR: false,
					ATTACH_FILES: false,
					CREATE_INSTANT_INVITE: false,
					EMBED_LINKS: false,
					MANAGE_CHANNELS: false,
					MANAGE_EMOJIS: false,
					MANAGE_MESSAGES: false,
					MANAGE_WEBHOOKS: false,
					MENTION_EVERYONE: false,
					MANAGE_ROLES: false,
					READ_MESSAGE_HISTORY: false,
					SEND_TTS_MESSAGES: false,
*/

				
				});
		}
	}
	for (const channel of guild.channels.cache
		.array()
		.filter((c) => c.type === "text"))
		await (channel as TextChannel).send(
			"Sunucuya saldırı tespit edildi, tüm kanallar kilitlendi ve yetkililer bildirildi.",
		);
	for (const id of CONFIG.ADMINS) {
		const user = client.users.cache.get(id);
		if (user)
			await user
				.send(
					"Sunucuya saldırı tespit edildi, tüm kanallar kilitlendi ve yetkililer bildirildi.",
				)
				.catch(() => null);
	}
}


async function lockRoles(guild: Guild): Promise<void> {
	for (const role of guild.roles.cache
		.array()
		.filter(
			(role) =>
				role.position <
				(guild.me as GuildMember).roles.highest.position,
		)) {
		await RoleModel.updateOne(
			{ roleID: role.id },
			{
				permissions: role.permissions.bitfield,
				roleID: role.id,
			},
			{ upsert: true },
		);
		await role.setPermissions(0);
	}
	for (const channel of guild.channels.cache
		.array()
		.filter((c) => c.type === "text"))
		await (channel as TextChannel).send(
			"Sunucuya saldırı tespit edildi, tüm roller kilitlendi ve yetkililer bildirildi.",
		);
	for (const id of CONFIG.ADMINS) {
		const user = client.users.cache.get(id);
		if (user)
			await user
				.send(
					"Sunucuya saldırı tespit edildi, tüm roller kilitlendi ve yetkililer bildirildi.",
				)
				.catch(() => null);
	}
}

async function unlockChannels(guild: Guild): Promise<void> {
	const channelData = await ChannelModel.find();
	const overWrites: IChannelPermissions = {};
	for (const data of channelData) {
		const channel = guild.channels.cache.get(data.channelID);
		if (!channel) continue;

		if (!overWrites[channel.id])
			overWrites[channel.id] = [
				{
					allow: data.allow,
					deny: data.deny,
					id: data.dataID,
				},
			];
		else
			overWrites[channel.id].push({
				allow: data.allow,
				deny: data.deny,
				id: data.dataID,
			});
	}
	console.dir(overWrites);
	for (const channelID in overWrites) {
		const channel = guild.channels.cache.get(channelID);
		if (!channel) continue;
		if (channel.manageable)
			await channel.overwritePermissions(overWrites[channelID]);
	}

	for (const channel of guild.channels.cache
		.array()
		.filter((c) => c.type === "text"))
		await (channel as TextChannel).send(
			"Tüm kanallar eski haline getirildi.",
		);
}


async function unlockRoles(guild: Guild): Promise<void> {
	const roleData = await RoleModel.find();
	const overWrites: IRolePermissions = {};
	for (const data of roleData) {
		const role = guild.roles.cache.get(data.roleID);
		if (!role) continue;
		overWrites[role.id] = {
			permissions: data.permissions,
		};
	}
	for (const roleID in overWrites) {
		const role = guild.roles.cache.get(roleID);
		if (!role) continue;
		if (role.position < (guild.me as GuildMember).roles.highest.position)
			await role.setPermissions(overWrites[roleID].permissions);
	}
	for (const channel of guild.channels.cache
		.array()
		.filter((c) => c.type === "text"))
		await (channel as TextChannel).send(
			"Tüm roller eski haline getirildi.",
		);
}


connect(CONFIG.MONGODB_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	useFindAndModify: false,
	useCreateIndex: true,
}).then(() => {
	pogger.success("MongoDB'ye bağlanıldı.");
	client.login(CONFIG.BOT_TOKEN);
});
