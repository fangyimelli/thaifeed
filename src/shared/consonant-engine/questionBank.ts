import type { SharedConsonantQuestion } from './types';

const DEFAULT_WRONG_FORMAT_HINT = '可用泰文字母、英文或注音作答。';
const DEFAULT_WRONG_ANSWER_HINT = '格式正確，但不是這一題的子音。';

export const SHARED_CONSONANT_QUESTION_BANK: SharedConsonantQuestion[] = [
  { questionId: 'n01_q01_wait', consonant: 'ร', promptText: '子音題：ร', hint: '這題是捲舌音。', acceptedAnswers: ['ro'], aliases: ['rorua', 'ro rua'], wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q02_house', consonant: 'บ', promptText: '子音題：บ', hint: '這題是雙唇塞音。', wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q03_child', consonant: 'ด', promptText: '子音題：ด', hint: '這題接近 d 音。', wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q04_night', consonant: 'ก', promptText: '子音題：ก', hint: '這題接近 g/k 音。', wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q05_door', consonant: 'ป', promptText: '子音題：ป', hint: '這題接近 p 音。', wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q06_sound', consonant: 'ส', promptText: '子音題：ส', hint: '這題接近 s 音。', wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q07_wind', consonant: 'ล', promptText: '子音題：ล', hint: '這題接近 l 音。', wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q08_return', consonant: 'ก', promptText: '子音題：ก', hint: '同樣是 g/k 音。', wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q09_why', consonant: 'ท', promptText: '子音題：ท', hint: '這題接近 th 音。', wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q10_turn', consonant: 'ห', promptText: '子音題：ห', hint: '這題接近 h 音。', wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT }
];
