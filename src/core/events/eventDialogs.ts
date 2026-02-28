import { pickWithoutRecent } from './dedupe';
import type { EventLinePhase, StoryEventDialog, StoryEventKey } from './eventTypes';

const dialogs: Record<StoryEventKey, StoryEventDialog> = {
  VOICE_CONFIRM: {
    opener: [
      { id: 'voice_open_1', text: '@${activeUser} 你那邊現在有開聲音嗎' },
      { id: 'voice_open_2', text: '@${activeUser} 你有聽到一點怪聲嗎' },
      { id: 'voice_open_3', text: '@${activeUser} 你耳機現在是開著的嗎' },
      { id: 'voice_open_4', text: '@${activeUser} 你那邊是不是有聲音飄過去' },
      { id: 'voice_open_5', text: '@${activeUser} 你剛剛有聽見嗎' },
      { id: 'voice_open_6', text: '@${activeUser} 你先聽一下有沒有異音' },
      { id: 'voice_open_7', text: '@${activeUser} 你那邊喇叭有開吧' },
      { id: 'voice_open_8', text: '@${activeUser} 你是不是也聽到了' }
    ],
    followUp: [
      { id: 'voice_follow_1', text: '@${activeUser} 我剛剛真的聽到一聲' },
      { id: 'voice_follow_2', text: '@${activeUser} 那聲音不像風耶' },
      { id: 'voice_follow_3', text: '@${activeUser} 聊天室有人也聽到了' },
      { id: 'voice_follow_4', text: '@${activeUser} 不是我在鬧你啦' },
      { id: 'voice_follow_5', text: '@${activeUser} 你再聽一次看看' },
      { id: 'voice_follow_6', text: '@${activeUser} 我雞皮疙瘩直接起來' }
    ]
  },
  GHOST_PING: {
    opener: [
      { id: 'ghost_ping_open_1', text: '@${activeUser} 你還在嗎' },
      { id: 'ghost_ping_open_2', text: '@${activeUser} 你有在看嗎' },
      { id: 'ghost_ping_open_3', text: '@${activeUser} 你現在有聽到我嗎' },
      { id: 'ghost_ping_open_4', text: '@${activeUser} 你是不是離開螢幕了' },
      { id: 'ghost_ping_open_5', text: '@${activeUser} 你回我一下好嗎' },
      { id: 'ghost_ping_open_6', text: '@${activeUser} 你在不在聊天室' },
      { id: 'ghost_ping_open_7', text: '@${activeUser} 你有沒有看到這裡' },
      { id: 'ghost_ping_open_8', text: '@${activeUser} 你現在是靜音嗎' }
    ],
    followUp: [
      { id: 'ghost_ping_follow_1', text: '@${activeUser} 你剛剛有聽到我說話嗎' },
      { id: 'ghost_ping_follow_2', text: '@${activeUser} 我剛剛到底講了什麼' },
      { id: 'ghost_ping_follow_3', text: '@${activeUser} 我聽到的聲音不像我自己' },
      { id: 'ghost_ping_follow_4', text: '@${activeUser} 你那邊聽起來正常嗎' },
      { id: 'ghost_ping_follow_5', text: '@${activeUser} 這一段我整個不敢回頭' },
      { id: 'ghost_ping_follow_6', text: '@${activeUser} 你有聽到第二個聲音嗎' }
    ]
  },
  TV_EVENT: {
    opener: [
      { id: 'tv_open_1', text: '@${activeUser} 你有看到畫面抖一下嗎' },
      { id: 'tv_open_2', text: '@${activeUser} 你剛剛有看到亮一下嗎' },
      { id: 'tv_open_3', text: '@${activeUser} 你那邊畫面有跳嗎' },
      { id: 'tv_open_4', text: '@${activeUser} 你看電視是不是動了一下' },
      { id: 'tv_open_5', text: '@${activeUser} 你有沒有看到那個閃動' },
      { id: 'tv_open_6', text: '@${activeUser} 你那邊畫面有怪怪的嗎' },
      { id: 'tv_open_7', text: '@${activeUser} 你是不是也看到它在動' },
      { id: 'tv_open_8', text: '@${activeUser} 你剛那下有看到吧' }
    ],
    followUp: [
      { id: 'tv_follow_1', text: '@${activeUser} 你真的沒看到我嗎' },
      { id: 'tv_follow_2', text: '@${activeUser} 我剛剛就在你後面耶' },
      { id: 'tv_follow_3', text: '@${activeUser} 你不要嚇我說你沒看見' },
      { id: 'tv_follow_4', text: '@${activeUser} 我剛剛真的看到有影子' },
      { id: 'tv_follow_5', text: '@${activeUser} 你再看一次拜託' },
      { id: 'tv_follow_6', text: '@${activeUser} 這樣我更不敢看了' }
    ]
  },
  NAME_CALL: {
    opener: [
      { id: 'name_open_1', text: '@${activeUser} 剛剛有人叫你名字嗎' },
      { id: 'name_open_2', text: '@${activeUser} 你有聽到有人喊你嗎' },
      { id: 'name_open_3', text: '@${activeUser} 我好像聽到有人叫你' },
      { id: 'name_open_4', text: '@${activeUser} 你名字剛剛是不是被叫了' },
      { id: 'name_open_5', text: '@${activeUser} 聊天室有人聽到叫名嗎' },
      { id: 'name_open_6', text: '@${activeUser} 你剛剛有回頭嗎' },
      { id: 'name_open_7', text: '@${activeUser} 我怎麼聽到有人喊你' },
      { id: 'name_open_8', text: '@${activeUser} 你那邊是不是也聽到了' }
    ],
    followUp: [
      { id: 'name_follow_1', text: '@${activeUser} 那聲音離你超近' },
      { id: 'name_follow_2', text: '@${activeUser} 我不確定那是不是人聲' },
      { id: 'name_follow_3', text: '@${activeUser} 你先別回頭' },
      { id: 'name_follow_4', text: '@${activeUser} 我耳朵直接麻掉' },
      { id: 'name_follow_5', text: '@${activeUser} 我剛剛真的有聽到你名字' },
      { id: 'name_follow_6', text: '@${activeUser} 你有沒有聽見第二次' }
    ]
  },
  VIEWER_SPIKE: {
    opener: [
      { id: 'viewer_open_1', text: '@${activeUser} 你看人數是不是突然跳了' },
      { id: 'viewer_open_2', text: '@${activeUser} 人數剛剛衝上去你有看到嗎' },
      { id: 'viewer_open_3', text: '@${activeUser} 你那邊人數也暴增嗎' },
      { id: 'viewer_open_4', text: '@${activeUser} 聊天室剛剛突然塞滿了耶' },
      { id: 'viewer_open_5', text: '@${activeUser} 你看一下人數欄好怪' },
      { id: 'viewer_open_6', text: '@${activeUser} 你有發現人數在跳嗎' },
      { id: 'viewer_open_7', text: '@${activeUser} 這波人數上升太快了吧' },
      { id: 'viewer_open_8', text: '@${activeUser} 人怎麼突然湧進來了' }
    ],
    followUp: [
      { id: 'viewer_follow_1', text: '@${activeUser} 這波人潮有點不對勁' },
      { id: 'viewer_follow_2', text: '@${activeUser} 我心裡反而更毛了' },
      { id: 'viewer_follow_3', text: '@${activeUser} 大家好像都在等什麼' },
      { id: 'viewer_follow_4', text: '@${activeUser} 這時候暴增很怪耶' },
      { id: 'viewer_follow_5', text: '@${activeUser} 你有看到彈幕忽然變快嗎' },
      { id: 'viewer_follow_6', text: '@${activeUser} 我感覺有人在靠近' }
    ]
  },
  LIGHT_GLITCH: {
    opener: [
      { id: 'light_open_1', text: '@${activeUser} 你看燈是不是又閃了' },
      { id: 'light_open_2', text: '@${activeUser} 那盞燈剛剛抖一下' },
      { id: 'light_open_3', text: '@${activeUser} 你有看到亮度在跳嗎' },
      { id: 'light_open_4', text: '@${activeUser} 那個燈真的很不穩' },
      { id: 'light_open_5', text: '@${activeUser} 你那邊也看到忽明忽暗嗎' },
      { id: 'light_open_6', text: '@${activeUser} 我覺得有人在碰開關' },
      { id: 'light_open_7', text: '@${activeUser} 你盯一下那個燈' },
      { id: 'light_open_8', text: '@${activeUser} 這燈光變化太怪了吧' }
    ],
    followUp: [
      { id: 'light_follow_1', text: '@${activeUser} 我真的不想在這時候停電' },
      { id: 'light_follow_2', text: '@${activeUser} 你有看到它又閃一下嗎' },
      { id: 'light_follow_3', text: '@${activeUser} 這種光線我超不安' },
      { id: 'light_follow_4', text: '@${activeUser} 燈一跳我心跳就跟著跳' },
      { id: 'light_follow_5', text: '@${activeUser} 感覺有人在旁邊看著' },
      { id: 'light_follow_6', text: '@${activeUser} 你先別離開畫面' }
    ]
  },
  FEAR_CHALLENGE: {
    opener: [
      { id: 'fear_open_1', text: '@${activeUser} 你現在真的不怕嗎' },
      { id: 'fear_open_2', text: '@${activeUser} 你敢說你現在很穩嗎' },
      { id: 'fear_open_3', text: '@${activeUser} 你心跳有加快嗎' },
      { id: 'fear_open_4', text: '@${activeUser} 你敢不敢再看一分鐘' },
      { id: 'fear_open_5', text: '@${activeUser} 你現在還能撐住嗎' },
      { id: 'fear_open_6', text: '@${activeUser} 你真的不會怕嗎' },
      { id: 'fear_open_7', text: '@${activeUser} 你要不要先深呼吸' },
      { id: 'fear_open_8', text: '@${activeUser} 你看起來有點硬撐耶' }
    ],
    followUp: [
      { id: 'fear_follow_1', text: '@${activeUser} 你剛剛說不怕我有聽到' },
      { id: 'fear_follow_2', text: '@${activeUser} 那你再盯住這裡' },
      { id: 'fear_follow_3', text: '@${activeUser} 我看你真的很敢' },
      { id: 'fear_follow_4', text: '@${activeUser} 你先不要眨眼' },
      { id: 'fear_follow_5', text: '@${activeUser} 等下別突然關掉喔' },
      { id: 'fear_follow_6', text: '@${activeUser} 我們再撐一下' }
    ],
    closer: [
      { id: 'fear_close_1', text: '@${activeUser} 我先下線一下 你自己小心' },
      { id: 'fear_close_2', text: '@${activeUser} 我撐不住了 我先退' },
      { id: 'fear_close_3', text: '@${activeUser} 我先離開一下 你別單看太久' },
      { id: 'fear_close_4', text: '@${activeUser} 我先關掉一會 你撐住' }
    ]
  }
};

function renderLine(template: string, activeUser: string): string {
  return template.split('${activeUser}').join(activeUser);
}

export function pickDialog(
  key: StoryEventKey,
  phase: EventLinePhase,
  activeUser: string,
  recentIds: string[]
): { id: string; text: string; repeatBlocked: boolean } {
  const bucket = dialogs[key][phase] ?? dialogs[key].followUp;
  const { option, repeatBlocked } = pickWithoutRecent(bucket, recentIds, phase === 'opener' ? 5 : 4);
  return {
    id: option.id,
    text: renderLine(option.text, activeUser),
    repeatBlocked
  };
}
