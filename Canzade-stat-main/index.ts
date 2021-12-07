import { Client, Collection, GuildMember, Message, MessageEmbed, TextChannel, Guild, VoiceChannel, MessageReaction, User } from "discord.js";
import { connect } from "mongoose";
import * as pogger from "pogger";
import { IVoiceModel, VoiceModel } from "./voiceModel";
import { IChannelModel, ChannelModel } from "./channelModel";
import { CONFIG } from "./config";
import ms from "parse-ms";
import { scheduleJob } from "node-schedule";
import { stringify } from "querystring";

const channelJoined = new Collection<string, number>();

const client = new Client({
    disableMentions: "everyone",
    fetchAllMembers: true,
    partials: [
        "CHANNEL",
        "GUILD_MEMBER",
        "USER"
    ],
    presence: {
        activity: {
            type: "PLAYING",
            name: "Zade ❤️ Labirent"
        }
    },
    ws: {
        intents: [
            "GUILDS",
            "GUILD_MEMBERS",
            "GUILD_MESSAGES",
            "GUILD_VOICE_STATES",
        ]
    }
});

client.on("ready", async () => {
    pogger.info("Leaderboards mesajları fetchleniyor");
    const channel = await client.channels.fetch(CONFIG.LEADERBOARDS_CHANNEL) as TextChannel;
    if (!channel) throw "Leaderboards kanalı bulunamadı.";
    const textMessage = await channel.messages.fetch(CONFIG.LEADERBOARDS_MESSAGE_TEXT);
    if (!textMessage) throw "Yazı leaderboards mesajı bulunamadı.";
    const voiceMessage = await channel.messages.fetch(CONFIG.LEADERBOARDS_MESSAGE_VOICE);
    if (!voiceMessage) throw "Sesli leaderboards mesajı bulunamadı.";
    pogger.success("Tüm doğrulama işlemleri başarılı");
    pogger.success(`Bot ${client.user?.tag} adı ile giriş yaptı.`);
    scheduleJob("*/30 * * * *", () => fetchLeaderBoards(channel, textMessage, voiceMessage));
});

client.on("message", async (message) => {
    if (
        !message.guild ||
        message.guild.id != CONFIG.GUILD_ID ||
        !message.content ||
        message.author.bot
    ) return;
    let channelModel = await ChannelModel.findOne({
        channelID: message.channel.id,
        guildID: message.guild.id,
        userID: message.author.id
    });
    if (!channelModel) channelModel = new ChannelModel({
        channelID: message.channel.id,
        guildID: message.guild.id,
        userID: message.author.id
    });
    channelModel.type = "text";
    channelModel.data += 1;
    await channelModel.save();
    let voiceModel = await VoiceModel.findOne({
        userID: message.author.id,
        guildID: message.guild.id
    });
    if (!voiceModel) {
        voiceModel = new VoiceModel({
            userID: message.author.id,
            guildID: message.guild.id
        });
    }
    const time = channelJoined.get(message.author.id);
    if (time) {
        const diffrence = Date.now() - time;
        voiceModel.voice += diffrence;
        channelJoined.set(message.author.id, Date.now());
    }
    
    voiceModel.messages += 1;
    await checkReward(message.member as GuildMember, voiceModel);
    await voiceModel.save();
    if (message.content === "!me") {
        
    const channelData = await ChannelModel.find({
        userID: message.author.id,
        guildID: message.guild.id
    });
    const voiceData = channelData
            .filter(data => data.type === "voice")
            .sort((a, c) => c.data - a.data)
            .slice(0, 30)
            .map((data, i) => {
                const channel = client.channels.cache.get(data.channelID) as VoiceChannel;
                const mention = channel.name ? channel.name : data.channelID;
                const formatted = ms(data.data);
                return `\`${i + 1}.\` ${mention}: \`${formatted.days} gün ${formatted.hours} saat ${formatted.minutes} dakika ${formatted.seconds} saniye\``;
            })
    const textData = channelData
            .filter(data => data.type === "text")
            .sort((a, c) => c.data - a.data)
            .slice(0, 30)
            .map((data, i) => {
                const channel = client.channels.cache.get(data.channelID) as TextChannel;
                const mention = channel.name ? channel.name : data.channelID;
                return `\`${i + 1}.\` ${mention}: \`${data.data}\`\n`;
            })

        const formatted = ms(voiceModel.voice);
        const embed = new MessageEmbed()
            .setColor("BLACK")
            .setAuthor(message.author.tag, message.author.avatarURL({ dynamic: true }) || undefined)
            .setDescription(`
${message.author.toString()} (${message?.member?.roles?.highest}) kişisinin sunucu verileri
`)
            .addField(`❯ Kanal Sıralaması (Toplam: ${formatted.days} gün ${formatted.hours} saat ${formatted.minutes} dakika ${formatted.seconds} saniye)`, `${voiceData.length ? voiceData.join() : "Ses Veriniz Bulunmamaktadır."}`)
            .addField(`❯ Kanal Sıralaması (Toplam: ${voiceModel.messages})`, textData.join(""))
            .setTimestamp(Date.now())
            .setFooter("Kullanıcı İstatistikleri")
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        message.channel.send(/*`**${message.member?.nickname || message.author.username}** kullanıcısının istatistikleri`,*/ embed);
        
    }
    if (message.content === "!toptext") {
        const [text] = await generateLeaderboardsEmbed(message.guild);
        message.channel.send(text);
    }
    if (message.content === "!topvoice") {
        const [, voice] = await generateLeaderboardsEmbed(message.guild);
        message.channel.send(voice);
    }
    if (message.content === "!top") {
        const top = await generateTopEmbed(message.guild);
        message.channel.send(top);
    }
    if (message.content === "!topchannel") {
        await generateChannelEmbed(message.member as GuildMember, message.channel as TextChannel)
    }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
    if (
        !oldState.member ||
        !newState.member ||
        oldState.member.guild.id != CONFIG.GUILD_ID ||
        oldState.member.user.bot || 
        newState.member.user.bot
    ) return;
    let voiceModel = await VoiceModel.findOne({
        userID: newState.member.user.id,
        guildID: newState.guild.id
    });
    let updated = false;
    if (!voiceModel) {
        voiceModel = new VoiceModel({
            userID: newState.member.user.id,
            guildID: newState.guild.id
        });
        updated = true;
    }

    /* Kanala katılırsa */
    if (!oldState.channelID && newState.channelID) {
        if (!newState.selfDeaf && !newState.selfMute) {
            channelJoined.set(newState.member.id, Date.now());
        }
    }

    /* kanaldan ayrılırsa */
    if (oldState.channel && !newState.channelID) {
        const time = channelJoined.get(oldState.member.id);
        if (time) {
            const diffrence = Date.now() - time;
            voiceModel.voice += diffrence;
            channelJoined.delete(oldState.member.id);
            updated = true;
            await checkReward(oldState.member, voiceModel);      
            let channelModel = await ChannelModel.findOne({
                channelID: oldState.channel.id,
                guildID: oldState.guild.id,
                userID: oldState.member.id
            });
            if (!channelModel) channelModel = new ChannelModel({
                channelID: oldState.channel.id,
                guildID:  oldState.guild.id,
                userID: oldState.member.id
            });
            channelModel.type = "voice";
            channelModel.data += diffrence;
            await channelModel.save();
        }
    }

    
    /* kanal değişirse */
    if (oldState.channel && newState.channelID) {
        const time = channelJoined.get(oldState.member.id);
        if (time) {
            const diffrence = Date.now() - time;
            voiceModel.voice += diffrence;
            channelJoined.set(newState.member.id, Date.now());
            updated = true;
            await checkReward(oldState.member, voiceModel);      
            let channelModel = await ChannelModel.findOne({
                channelID: oldState.channel.id,
                guildID: oldState.guild.id,
                userID: oldState.member.id
            });
            if (!channelModel) channelModel = new ChannelModel({
                channelID: oldState.channel.id,
                guildID:  oldState.guild.id,
                userID: oldState.member.id
            });
            channelModel.type = "voice";
            channelModel.data += diffrence;
            await channelModel.save();
        }
    }

    /* Kulaklık - mic kaparsa */
    if (newState.channelID && (newState.selfDeaf || newState.selfMute)) {
        const time = channelJoined.get(newState.member.id);
        if (time) {
            const diffrence = Date.now() - time;
            voiceModel.voice += diffrence;
            channelJoined.delete(oldState.member.id);
            updated = true;
            await checkReward(oldState.member, voiceModel);
            let channelModel = await ChannelModel.findOne({
                channelID: (newState.channel as VoiceChannel).id,
                guildID: newState.guild.id,
                userID: newState.member.id
            });
            if (!channelModel) channelModel = new ChannelModel({
                channelID: (newState.channel as VoiceChannel).id,
                guildID:  newState.guild.id,
                userID: newState.member.id
            });
            channelModel.type = "voice";
            channelModel.data += diffrence;
            await channelModel.save();
        }
    }

    /* Kulaklık - mic açarsa */
    if (
        (oldState.selfDeaf || oldState.selfMute) && 
        !newState.selfDeaf && 
        !newState.selfMute
    ) {
        channelJoined.set(newState.member.id, Date.now());
    }

    if (updated) await voiceModel.save();
});

async function checkReward(member: GuildMember, voiceModel: IVoiceModel): Promise<void> {
    const voiceRewards = CONFIG.VOICE_REWARDS.filter(reward => 
        member.guild.roles.cache.has(reward.role) &&
        reward.rank <= voiceModel.voice && 
        !member.roles.cache.has(reward.role)
    )
        .map(reward => reward.role)
    const textRewards = CONFIG.TEXT_REWARDS.filter(reward => 
        member.guild.roles.cache.has(reward.role) &&
        reward.rank <= voiceModel.messages && 
        !member.roles.cache.has(reward.role)
    )
        .map(reward => reward.role)
    const channel = member.guild.channels.cache.get(CONFIG.REWARD_CHANNEL) as TextChannel;
    if (voiceRewards.length > 0) {
        await member.roles.add(voiceRewards);
       // if (channel) await channel.send(`Tebrikler ${member.toString()}! Sesli kanallarda vakit geçirerek **${voiceRewards.map(id => member.guild.roles.cache.get(id)?.name).join(", ")}** rol(lerini) kazandın!`);
       if (channel) await channel.send(`🎉 ${member.toString()} tebrikler! Ses istatistiklerin bir sonraki seviyeye atlaman için yeterli oldu. **"${voiceRewards.map(id => member.guild.roles.cache.get(id)?.name).join(", ")}"** rolüne terfi edildin!`);
    }
    if (textRewards.length > 0) {
        await member.roles.add(textRewards);
        if (channel) await channel.send(`🎉 ${member.toString()} tebrikler! Mesaj istatistiklerin bir sonraki seviyeye atlaman için yeterli oldu. **"${textRewards.map(id => member.guild.roles.cache.get(id)?.name).join(", ")}"** rolüne terfi edildin!`);
       // if (channel) await channel.send(`Tebrikler ${member.toString()}! Sohbet kanallarında vakit geçirerek **${textRewards.map(id => member.guild.roles.cache.get(id)?.name).join(", ")}** rol(lerini) kazandın!`);
    }
}

async function fetchLeaderBoards(channel: TextChannel, textMessage: Message, voiceMessage: Message): Promise<void> {
    const [text, voice] = await generateLeaderboardsEmbed(channel.guild);

    await textMessage.edit(text);
    await voiceMessage.edit(voice);
}

async function generateLeaderboardsEmbed(guild: Guild): Promise<[MessageEmbed, MessageEmbed]> {
    const voiceList = await VoiceModel.find({ guildID: guild.id }).sort("-voice").limit(20);
    const textList = await VoiceModel.find({ guildID: guild.id }).sort("-messages").limit(20);

    const voice = new MessageEmbed()
        .setAuthor("Labirent Ses sıralaması | Tüm zamanlar")      
        .setFooter("Son güncelleme")
        .setColor("BLACK")
        .setTimestamp(Date.now());

    const text = new MessageEmbed()
        .setAuthor("Labirent Mesaj sıralaması | Tüm zamanlar")       
        .setFooter("Son güncelleme")
        .setColor("BLACK")
        .setTimestamp(Date.now());

    let voiceDescription = "";
    let textDescription = "";

    for (let i = 0; i < voiceList.length; i++) {
        const data = voiceList[i];
        const user = client.users.cache.get(data.userID);
        const mention = user ? user.toString() : data.userID;
        const formatted = ms(data.voice);
        voiceDescription += `**${i + 1}.** ${mention}: ${formatted.days} gün ${formatted.hours} saat ${formatted.minutes} dakika ${formatted.seconds} saniye\n`;
    }
    for (let i = 0; i < textList.length; i++) {
        const data = textList[i];
        const user = client.users.cache.get(data.userID);
        const mention = user ? user.toString() : data.userID;
        textDescription += `**${i + 1}.** ${mention}: ${data.messages} mesaj\n`;
    }

    voice.setDescription(voiceDescription);
    text.setDescription(textDescription);

    return [text, voice];
}

async function generateTopEmbed(guild: Guild): Promise<MessageEmbed> {
    const voiceList = await VoiceModel.find({ guildID: guild.id }).sort("-voice").limit(10);
    const textList = await VoiceModel.find({ guildID: guild.id }).sort("-messages").limit(10);

    const top = new MessageEmbed()
        .setAuthor("Labirent Top sıralaması | Tüm zamanlar")
        .setFooter("Son güncelleme")
        .setColor("BLACK")
        .setTimestamp(Date.now());

    let voiceDescription = "";
    let textDescription = "";

    for (let i = 0; i < voiceList.length; i++) {
        const data = voiceList[i];
        const user = client.users.cache.get(data.userID);
        const mention = user ? user.toString() : data.userID;
        const formatted = ms(data.voice);
        voiceDescription += `**${i + 1}.** ${mention}: ${formatted.days} gün ${formatted.hours} saat ${formatted.minutes} dakika ${formatted.seconds} saniye\n`;
    }
    for (let i = 0; i < textList.length; i++) {
        const data = textList[i];
        const user = client.users.cache.get(data.userID);
        const mention = user ? user.toString() : data.userID;
        textDescription += `**${i + 1}.** ${mention}: ${data.messages} mesaj\n`;
    }

    top.setDescription(`**Sesli Sıralaması:**\n${voiceDescription}\n\n**Mesaj Sıralaması:**\n${textDescription}`);

    return top;
}

async function generateChannelEmbed(member: GuildMember, channel: TextChannel): Promise<void> {
    const channelData = await ChannelModel.find({
        userID: member.id,
        guildID: member.guild.id
    });
    const voiceData = channelData
            .filter(data => data.type === "voice")
            .sort((a, c) => c.data - a.data)
            .slice(0, 30)
            .map((data, i) => {
                const channel = client.channels.cache.get(data.channelID) as VoiceChannel;
                const mention = channel ? channel.toString() : data.channelID;
                const formatted = ms(data.data);
                return `**${i + 1}.** ${mention}: ${formatted.days} gün ${formatted.hours} saat ${formatted.minutes} dakika ${formatted.seconds} saniye\n`;
            })
    const textData = channelData
            .filter(data => data.type === "text")
            .sort((a, c) => c.data - a.data)
            .slice(0, 30)
            .map((data, i) => {
                const channel = client.channels.cache.get(data.channelID) as TextChannel;
                const mention = channel ? channel.toString() : data.channelID;
                return `**${i + 1}.** ${mention}: ${data.data} mesaj\n`;
            })


    const embed = new MessageEmbed()
        .setTitle("Kanal Sıralaması")
        .setTimestamp(Date.now())
        .setDescription(
            `**Sesli Sıralaması:**\n${voiceData.join("")}\n\n**Mesaj Sıralaması:**\n${textData.join("")}`
        )
        .setColor("BLACK")
        .setFooter("Kanal Sıralaması")
    await channel.send(embed);
}

connect(CONFIG.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
})
    .then(async () => {
        pogger.success("MongoDB'ye bağlanıldı.");
        await client.login(CONFIG.BOT_TOKEN);
    });

