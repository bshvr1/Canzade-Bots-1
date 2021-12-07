const { Collection } = require("discord.js");
const inviterSchema = require("../models/inviter");
const inviteMemberSchema = require("../models/inviteMember");
const conf = require("../configs/config.json");
const moment = require("moment");
moment.locale("tr")

module.exports = class {
    constructor(client) {
      this.client = client;
    }

    async run(member) {
      const channel = member.guild.channels.cache.get(conf.welcomeChannel);
      const log = member.guild.channels.cache.get(conf.invLogChannel);
      const kurallar = member.guild.channels.cache.get(conf.kurallar);
      if (!channel) return;
      if (member.user.bot) return;
    
      if (!log) return;
      if (member.user.bot) return;
    
      const gi = this.client.guildInvıtes.get(member.guild.id).clone() || new Collection().clone();
      const invites = await member.guild.fetchInvites();
      const invite = invites.find((x) => gi.has(x.code) && gi.get(x.code).uses < x.uses) || gi.find((x) => !invites.has(x.code)) || member.guild.vanityURLCode;
      this.client.guildInvıtes.set(member.guild.id, invites);
      let isMemberFake = (Date.now() - member.user.createdTimestamp) < 7*24*60*60*1000;
    
      if (invite === member.guild.vanityURLCode) channel.send(`
Middle Earth'a hoş geldin ${member}! Hesabın ${moment(member.user.createdTimestamp).format("LLL")} tarihinde oluşturulmuş. ${isMemberFake ? `🚫` : ``}
    
Sunucuya erişebilmek için "V.Confirmed" odalarında kayıt olup isim yaş belirtmen gerekmektedir.    
Sunucu kurallarımız ${kurallar} kanalında belirtilmiştir. Unutma sunucu içerisindeki ceza işlemlerin kuralları okuduğunu varsayarak gerçekleştirilecek.
          
Seninle beraber ${member.guild.memberCount} kişiyiz. 🎉🎉🎉
    `);
    if (invite === member.guild.vanityURLCode) log.send(`${member} katıldı! **Davet eden:** Sunucu Özel URL ${isMemberFake ? `🚫` : ``}`);
    
      if (!invite.inviter) return;
      await inviteMemberSchema.findOneAndUpdate({ guildID: member.guild.id, userID: member.user.id }, { $set: { inviter: invite.inviter.id, date: Date.now() } }, { upsert: true });
      if (Date.now() - member.user.createdTimestamp <= 1000 * 60 * 60 * 24 * 7) {
        await inviterSchema.findOneAndUpdate({ guildID: member.guild.id, userID: invite.inviter.id }, { $inc: { total: 1, fake: 1 } }, { upsert: true });
        const inviterData = await inviterSchema.findOne({ guildID: member.guild.id, userID: invite.inviter.id });
        const total = inviterData ? inviterData.total : 0;
        channel.send(`
Middle Earth'a hoş geldin ${member}! Hesabın ${moment(member.user.createdTimestamp).format("LLL")} tarihinde oluşturulmuş. 🚫
    
Sunucuya erişebilmek için "V.Confirmed" odalarında kayıt olup isim yaş belirtmen gerekmektedir.      
Sunucu kurallarımız ${kurallar} kanalında belirtilmiştir. Unutma sunucu içerisindeki ceza işlemlerin kuralları okuduğunu varsayarak gerçekleştirilecek.
            
Seninle beraber ${member.guild.memberCount} kişiyiz. ${invite.inviter} tarafından davet edildin ve bu kişinin ${total} daveti oldu! 🎉🎉🎉
        `);
        log.send(`${member} sunucuya katıldı. **${invite.inviter.tag}** tarafından davet edildi. 🚫 (**${total}** davet)`);
      } else {
        await inviterSchema.findOneAndUpdate({ guildID: member.guild.id, userID: invite.inviter.id }, { $inc: { total: 1, regular: 1 } }, { upsert: true });
        const inviterData = await inviterSchema.findOne({ guildID: member.guild.id, userID: invite.inviter.id });
        const total = inviterData ? inviterData.total : 0;
        channel.send(`
Middle Earth'a hoş geldin ${member}! Hesabın ${moment(member.user.createdTimestamp).format("LLL")} tarihinde oluşturulmuş.
    
Sunucuya erişebilmek için "V.Confirmed" odalarında kayıt olup isim yaş belirtmen gerekmektedir.     
Sunucu kurallarımız ${kurallar} kanalında belirtilmiştir. Unutma sunucu içerisindeki ceza işlemlerin kuralları okuduğunu varsayarak gerçekleştirilecek.
            
Seninle beraber ${member.guild.memberCount} kişiyiz. ${invite.inviter} tarafından davet edildin ve bu kişinin ${total} daveti oldu! 🎉🎉🎉
    `);
    
    /* 🎉 Lorien'e hoş geldin ${member}! Hesabın ${moment(member.user.createdTimestamp).format("LLL")} tarihinde oluşturulmuş.
    
    Sunucuya erişebilmek için "V.Confirmed" odalarında kayıt olup isim yaş belirtmen gerekmektedir.
    
    Sunucu kurallarımız ${kurallar} kanalında belirtilmiştir. Unutma sunucu içerisindeki ceza işlemlerin kuralları okuduğunu varsayarak gerçekleştirilecek.
        
    Seninle beraber ${member.guild.memberCount} kişiyiz. ${invite.inviter} tarafından davet edildin ve bu kişinin ${total} daveti oldu.🎉🎉🎉 */
    
    log.send(`${member} sunucumuza katıldı. **${invite.inviter.tag}** tarafından davet edildi. (**${total}** davet)`);
      }
    
    };
  }
     /* Lorien'e hoş geldin ${member} ! 
    ${isMemberFake ? `🚫` : ``}
    Hesabın ${moment(member.user.createdTimestamp).format("LLL")} (${moment(member.user.createdAt).add(5, 'gün').fromNow().replace("birkaç saniye önce", " ")}) oluşturulmuş. 🚫
    
    Sunucu kurallarımız ${kurallar} kanalında belirtilmiştir. Unutma sunucu içerisindeki ceza işlemlerin kuralları okuduğunu varsayarak gerçekleştirilecek.
    
    ${invite.inviter} ${total}. davetini gerçekleştirerek sunucumuzun ${member.guild.memberCount}. üyesi olmanı sağladı! İyi eğlenceler 🎉🎉🎉*/
    
    
    /* 🎉 Lorien'e hoş geldin ${member} ! 
    
    Hesabın ${moment(member.user.createdTimestamp).format("LLL")} (${moment(member.user.createdAt).add(5, 'gün').fromNow().replace("birkaç saniye önce", " ")}) oluşturulmuş ${isMemberFake ? `🚫` : ``}
    
    Sunucu kurallarımız ${kurallar} kanalında belirtilmiştir. Unutma sunucu içerisindeki ceza işlemlerin kuralları okuduğunu varsayarak gerçekleştirilecek. 
    
    Seninle beraber ${member.guild.memberCount} kişi olduk! Sol tarafta bulunan **V. Confirmed** odalarından birine girerek kayıt işlemini gerçekleştirebilirsin.*/