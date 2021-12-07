const Command = require("../base/Command.js");
const Discord = require("discord.js");
const inviterSchema = require("../models/inviter");
const inviteMemberSchema = require("../models/inviteMember");
const conf = require("../configs/config.json");
const moment = require('moment');
class Üyeler extends Command {
    constructor(client) {
        super(client, {
            name: "inv-log",
            aliases: ["uyeler", "sondavet", "üyeler"]
        });
    }

    async run(message, args) {
        if(message.channel.id == conf.General_Chat && !message.member.hasPermission('ADMINISTRATOR')) return message.react(conf.no)
        let embed = new Discord.MessageEmbed().setColor("RANDOM").setAuthor(message.member.displayName, message.author.avatarURL({ dynamic: true, })).setFooter(`Zade was here!`).setTimestamp();
        const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
        const data = await inviteMemberSchema.find({ guildID: message.guild.id, inviter: member.user.id });
        const filtered = data.filter(x => message.guild.members.cache.get(x.userID));
       // console.log(filtered)
       embed.setAuthor(member.user.tag, member.user.avatarURL({ dynamic: true }))
       .setFooter(`Can was here!`).setTimestamp()
        embed.setDescription(filtered.length > 0 ? filtered.map(m => `<@${m.userID}>: ${moment(m.date).format("LLL")}`).join("\n") : "İnvite yapmamışsın.");
        message.channel.send(embed);
      
    }
}

module.exports = Üyeler; 