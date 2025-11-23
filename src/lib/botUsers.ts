export type BotUser = {
  uid: string;
  name: string;
  email: string;
  isBot: true;
  icon: 'warp' | 'cursor';
};

export const BOT_USERS: BotUser[] = [
  {
    uid: 'bot-warp',
    name: 'Warp',
    email: 'warp@nexboard.bot',
    isBot: true,
    icon: 'warp',
  },
  {
    uid: 'bot-cursor',
    name: 'Cursor',
    email: 'cursor@nexboard.bot',
    isBot: true,
    icon: 'cursor',
  },
];

export function isBotUser(uid: string): boolean {
  return BOT_USERS.some(bot => bot.uid === uid);
}

export function getBotUser(uid: string): BotUser | undefined {
  return BOT_USERS.find(bot => bot.uid === uid);
}

export function getAllAssignees(humanMembers: { uid: string; name?: string; email?: string }[]): Array<{ uid: string; name?: string; email?: string; isBot?: boolean; icon?: 'warp' | 'cursor' }> {
  return [...humanMembers, ...BOT_USERS];
}
