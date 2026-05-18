require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require('discord.js');

const cron = require('node-cron');
const Database = require('better-sqlite3');
const db = new Database('database.sqlite');

const db = new sqlite3.Database('./database.sqlite');

db.run(`
CREATE TABLE IF NOT EXISTS birthdays (
  userId TEXT PRIMARY KEY,
  birthday TEXT
)
`);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

client.once('clientReady', () => {
  console.log(`${client.user.tag} is online.`);
});

client.on('messageCreate', message => {
  if (message.author.bot) return;

  // Set Birthday
  if (message.content.startsWith('!setbirthday')) {
    const args = message.content.split(' ');
    const birthday = args[1];

    if (!birthday) {
      return message.reply('Use: !setbirthday DD-MM');
    }

    db.run(
      `INSERT OR REPLACE INTO birthdays(userId, birthday) VALUES(?, ?)`,
      [message.author.id, birthday]
    );

    const embed = new EmbedBuilder()
      .setTitle('🎂 Birthday Saved')
      .setDescription(`Your birthday is set to ${birthday}`)
      .setColor('Pink');

    message.reply({ embeds: [embed] });
  }

  // Check Birthday
  if (message.content === '!mybirthday') {
    db.get(
      `SELECT birthday FROM birthdays WHERE userId = ?`,
      [message.author.id],
      (err, row) => {
        if (!row) {
          return message.reply('No birthday saved.');
        }

        const embed = new EmbedBuilder()
          .setTitle('📅 Your Birthday')
          .setDescription(`🎉 ${row.birthday}`)
          .setColor('Blue');

        message.reply({ embeds: [embed] });
      }
    );
  }
});

// Daily Birthday Check
cron.schedule('0 0 * * *', async () => {
  const today = new Date();

  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const todayDate = `${day}-${month}`;

  client.guilds.cache.forEach(async guild => {

    const birthdayRole = guild.roles.cache.find(
      r => r.name === '🎂 Birthday'
    );

    const channel = guild.channels.cache.find(
      c => c.name === 'birthdays'
    );

    db.all(
      `SELECT userId FROM birthdays WHERE birthday = ?`,
      [todayDate],
      async (err, rows) => {

        if (!rows.length) return;

        for (const row of rows) {

          const member = await guild.members
            .fetch(row.userId)
            .catch(() => null);

          if (!member) continue;

          // Add Birthday Role
          if (birthdayRole) {
            member.roles.add(birthdayRole);
          }

          const embed = new EmbedBuilder()
            .setTitle('🎉 HAPPY BIRTHDAY!')
            .setDescription(
              `Happy Birthday <@${member.id}>!\nHave an amazing day and good luck in your studies 📚`
            )
            .setColor('Gold')
            .setThumbnail(member.user.displayAvatarURL());

          if (channel) {
            channel.send({ embeds: [embed] });
          }
        }
      }
    );
  });
});

client.login(process.env.TOKEN);