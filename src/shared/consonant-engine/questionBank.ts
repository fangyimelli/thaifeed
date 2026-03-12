import { CONSONANT_BANK_BY_CHAR } from './consonantBank';
import type { SharedConsonantQuestion } from './types';

const DEFAULT_WRONG_FORMAT_HINT = '可用泰文字母、英文或注音作答。';
const DEFAULT_WRONG_ANSWER_HINT = '格式正確，但不是這一題的子音。';

const accepted = (consonant: string) => CONSONANT_BANK_BY_CHAR.get(consonant)?.acceptedCandidates ?? [consonant];

export const SHARED_CONSONANT_QUESTION_BANK: SharedConsonantQuestion[] = [
  { questionId: 'n01_q01_wait', consonant: 'ร', promptText: '子音題：ร', hint: '這題是捲舌音。', acceptedAnswers: accepted('ร'), aliases: ['ro rua'], wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q02_house', consonant: 'บ', promptText: '子音題：บ', hint: '這題是雙唇塞音。', acceptedAnswers: accepted('บ'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q03_child', consonant: 'ด', promptText: '子音題：ด', hint: '這題接近 d 音。', acceptedAnswers: accepted('ด'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q04_night', consonant: 'ก', promptText: '子音題：ก', hint: '這題接近 g/k 音。', acceptedAnswers: accepted('ก'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q05_door', consonant: 'ป', promptText: '子音題：ป', hint: '這題接近 p 音。', acceptedAnswers: accepted('ป'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q06_sound', consonant: 'ส', promptText: '子音題：ส', hint: '這題接近 s 音。', acceptedAnswers: accepted('ส'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q07_wind', consonant: 'ล', promptText: '子音題：ล', hint: '這題接近 l 音。', acceptedAnswers: accepted('ล'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q08_return', consonant: 'ก', promptText: '子音題：ก', hint: '同樣是 g/k 音。', acceptedAnswers: accepted('ก'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q09_why', consonant: 'ท', promptText: '子音題：ท', hint: '這題接近 th 音。', acceptedAnswers: accepted('ท'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n01_q10_turn', consonant: 'ห', promptText: '子音題：ห', hint: '這題接近 h 音。', acceptedAnswers: accepted('ห'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },

  { questionId: 'n02_q01_side', consonant: 'ข', promptText: '子音題：ข', hint: '這題接近 kh 音。', acceptedAnswers: accepted('ข'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n02_q02_i', consonant: 'ฉ', promptText: '子音題：ฉ', hint: '這題接近 chh 音。', acceptedAnswers: accepted('ฉ'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n02_q03_cave', consonant: 'ถ', promptText: '子音題：ถ', hint: '這題接近 th 音。', acceptedAnswers: accepted('ถ'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n02_q04_ghost', consonant: 'ผ', promptText: '子音題：ผ', hint: '這題接近 ph 音。', acceptedAnswers: accepted('ผ'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n02_q05_rain', consonant: 'ฝ', promptText: '子音題：ฝ', hint: '這題接近 f 音。', acceptedAnswers: accepted('ฝ'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n02_q06_meet', consonant: 'จ', promptText: '子音題：จ', hint: '這題接近 j 音。', acceptedAnswers: accepted('จ'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n02_q07_eye', consonant: 'ต', promptText: '子音題：ต', hint: '這題接近 t 音。', acceptedAnswers: accepted('ต'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n02_q08_out', consonant: 'อ', promptText: '子音題：อ', hint: '這題是喉塞起音。', acceptedAnswers: accepted('อ'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n02_q09_person', consonant: 'ค', promptText: '子音題：ค', hint: '這題接近 kh 音。', acceptedAnswers: accepted('ค'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n02_q10_snake', consonant: 'ง', promptText: '子音題：ง', hint: '這題接近 ng 音。', acceptedAnswers: accepted('ง'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },

  { questionId: 'n03_q01_slow', consonant: 'ช', promptText: '子音題：ช', hint: '這題接近 chh 音。', acceptedAnswers: accepted('ช'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n03_q02_hide', consonant: 'ซ', promptText: '子音題：ซ', hint: '這題接近 s 音。', acceptedAnswers: accepted('ซ'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n03_q03_sleep', consonant: 'น', promptText: '子音題：น', hint: '這題接近 n 音。', acceptedAnswers: accepted('น'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n03_q04_take', consonant: 'พ', promptText: '子音題：พ', hint: '這題接近 ph 音。', acceptedAnswers: accepted('พ'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n03_q05_listen', consonant: 'ฟ', promptText: '子音題：ฟ', hint: '這題接近 f 音。', acceptedAnswers: accepted('ฟ'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n03_q06_look', consonant: 'ม', promptText: '子音題：ม', hint: '這題接近 m 音。', acceptedAnswers: accepted('ม'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n03_q07_stay', consonant: 'ย', promptText: '子音題：ย', hint: '這題接近 y 音。', acceptedAnswers: accepted('ย'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n03_q08_run', consonant: 'ว', promptText: '子音題：ว', hint: '這題接近 w 音。', acceptedAnswers: accepted('ว'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n03_q09_room', consonant: 'ฮ', promptText: '子音題：ฮ', hint: '這題接近 h 音。', acceptedAnswers: accepted('ฮ'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT },
  { questionId: 'n03_q10_lula', consonant: 'ฬ', promptText: '子音題：ฬ', hint: '這題接近 l 音。', acceptedAnswers: accepted('ฬ'), wrongFormatHint: DEFAULT_WRONG_FORMAT_HINT, wrongAnswerHint: DEFAULT_WRONG_ANSWER_HINT }
];
