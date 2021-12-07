const config = require("../configs/config.json")
module.exports = class {
  constructor(client) {
    this.client = client;
  }

  async run() {
    await this.client.wait(1000);
    this.client.appInfo = await this.client.fetchApplication();
    setInterval(async () => {
      this.client.appInfo = await this.client.fetchApplication();
    }, 60000);
    
    this.client.guilds.cache.forEach(guildStarlite => {
      guildStarlite.fetchInvites().then(starliteInvites => {
          this.client.guildInvıtes.set(guildStarlite.id, starliteInvites);
          this.client.logger.log(`${guildStarlite.name} davetleri tanımlandı ✔`, "ready")
      }).catch(err => { this.client.logger.log("Davetler tanımlanamadı.", "ready") });
    });
    
    let kanal = this.client.channels.cache.filter(x => x.type === "voice" && x.id === config.BotVoiceChannel);


    
    setInterval(() => {
      const customStatus = ["Zade ❤️ Barbarbar338", "Zade ❤️ Middle Earth", "Barbarbar ❤️ Middle Earth"]
      const reloadStatus = Math.floor(Math.random() * (customStatus.length));
      this.client.user.setActivity(`${customStatus[reloadStatus]}`, { type: "PLAYING"})
      kanal.map(channel => {
        if (channel.id === config.BotVoiceChannel) {
          if (channel.members.some(member => member.id === this.client.user.id)) return;
          if (!this.client.channels.cache.get(config.BotVoiceChannel)) return;
          this.client.channels.cache.get(channel.id).join().then(x => console.log("Bot başarılı bir şekilde ses kanalına bağlandı")).catch(() => console.log("Bot ses kanalına bağlanırken bir sorun çıktı Lütfen Yetkileri kontrol ediniz!"));
        } else return;
      });
    }, 10000);
    this.client.logger.log(`${this.client.user.tag}, kullanıma hazır ${this.client.users.cache.size} kullanıcı, ${this.client.guilds.cache.size} sunucu.`, "ready");
  }
};
