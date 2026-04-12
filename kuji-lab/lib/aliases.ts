export interface IpEntry {
  id: string
  displayNames: Record<string, string>  // locale → display name
  category: string
  pattern: RegExp
  aliases: string[]
}

export function getDisplayName(entry: IpEntry, locale: string): string {
  return entry.displayNames[locale] ?? entry.displayNames['ko']
}

export const IP_LIST: IpEntry[] = [
  // ── 소년 만화 / 少年漫画 / Shonen ─────────────────────────
  { id: 'one-piece',      displayNames: { ko: '원피스',           ja: 'ワンピース',              en: 'One Piece'             }, category: 'shonen',    pattern: /ワンピース|ONE PIECE/i,               aliases: ['원피스', 'One Piece', 'onepiece'] },
  { id: 'dragon-ball',    displayNames: { ko: '드래곤볼',          ja: 'ドラゴンボール',           en: 'Dragon Ball'           }, category: 'shonen',    pattern: /ドラゴンボール|DRAGON BALL/i,         aliases: ['드래곤볼', '드래곤 볼', 'Dragon Ball', 'dragonball'] },
  { id: 'naruto',         displayNames: { ko: '나루토',            ja: 'ナルト',                  en: 'Naruto'                }, category: 'shonen',    pattern: /ナルト|NARUTO/i,                      aliases: ['나루토', 'Naruto'] },
  { id: 'bleach',         displayNames: { ko: '블리치',            ja: 'BLEACH',                  en: 'Bleach'                }, category: 'shonen',    pattern: /BLEACH|ブリーチ/i,                    aliases: ['블리치', 'Bleach'] },
  { id: 'hxh',            displayNames: { ko: '헌터×헌터',         ja: 'HUNTER×HUNTER',           en: 'Hunter × Hunter'       }, category: 'shonen',    pattern: /HUNTER.*HUNTER|ハンター.*ハンター/i,  aliases: ['헌터x헌터', '헌터 헌터', 'Hunter x Hunter'] },
  { id: 'kimetsu',        displayNames: { ko: '귀멸의 칼날',       ja: '鬼滅の刃',                en: 'Demon Slayer'          }, category: 'shonen',    pattern: /鬼滅の刃/,                            aliases: ['귀멸의 칼날', '귀멸', 'Demon Slayer'] },
  { id: 'shingeki',       displayNames: { ko: '진격의 거인',       ja: '進撃の巨人',              en: 'Attack on Titan'       }, category: 'shonen',    pattern: /進撃の巨人/,                          aliases: ['진격의 거인', '진격', 'Attack on Titan', 'AoT'] },
  { id: 'mha',            displayNames: { ko: '나의 히어로',       ja: 'ヒロアカ',                en: 'My Hero Academia'      }, category: 'shonen',    pattern: /僕のヒーローアカデミア|ヒロアカ/,     aliases: ['나의 히어로 아카데미아', '히로아카', 'My Hero Academia', 'MHA'] },
  { id: 'jjk',            displayNames: { ko: '주술회전',          ja: '呪術廻戦',                en: 'Jujutsu Kaisen'        }, category: 'shonen',    pattern: /呪術廻戦/,                            aliases: ['주술회전', 'Jujutsu Kaisen', 'JJK'] },
  { id: 'gintama',        displayNames: { ko: '은혼',              ja: '銀魂',                    en: 'Gintama'               }, category: 'shonen',    pattern: /銀魂/,                                aliases: ['은혼', 'Gintama'] },
  { id: 'yuyu',           displayNames: { ko: '유유백서',          ja: '幽☆遊☆白書',             en: 'Yu Yu Hakusho'         }, category: 'shonen',    pattern: /幽☆遊☆白書|幽遊白書/,               aliases: ['유유백서', 'Yu Yu Hakusho'] },
  { id: 'jojo',           displayNames: { ko: '죠죠',              ja: 'ジョジョ',                en: 'JoJo'                  }, category: 'shonen',    pattern: /JOJO|ジョジョの奇妙な冒険|ジョジョ/i, aliases: ['죠죠의 기묘한 모험', '죠죠', "JoJo's Bizarre Adventure"] },
  { id: 'yugioh',         displayNames: { ko: '유희왕',            ja: '遊☆戯☆王',               en: 'Yu-Gi-Oh'              }, category: 'shonen',    pattern: /遊☆戯☆王|遊戯王/,                   aliases: ['유희왕', 'Yu-Gi-Oh', 'Yugioh'] },
  { id: 'haikyuu',        displayNames: { ko: '하이큐',            ja: 'ハイキュー!!',            en: 'Haikyuu!!'             }, category: 'shonen',    pattern: /ハイキュー/,                          aliases: ['하이큐', 'Haikyuu', 'Haikyu'] },
  { id: 'kuroko',         displayNames: { ko: '쿠로코의 농구',     ja: '黒子のバスケ',            en: 'Kuroko no Basket'      }, category: 'shonen',    pattern: /黒子のバスケ|黒バス/,                 aliases: ['쿠로코의 농구', '쿠로코', 'Kuroko no Basket'] },
  { id: 'fairy-tail',     displayNames: { ko: '페어리 테일',       ja: 'フェアリーテイル',        en: 'Fairy Tail'            }, category: 'shonen',    pattern: /FAIRY TAIL|フェアリーテイル/i,        aliases: ['페어리 테일', 'Fairy Tail'] },
  { id: 'sao',            displayNames: { ko: '소드 아트 온라인',  ja: 'ソードアート・オンライン', en: 'Sword Art Online'      }, category: 'shonen',    pattern: /ソードアート・オンライン|SAO(?!\w)/i, aliases: ['소드 아트 온라인', 'Sword Art Online', 'SAO'] },
  { id: 'rezero',         displayNames: { ko: '리제로',            ja: 'Re:ゼロ',                 en: 'Re:Zero'               }, category: 'shonen',    pattern: /Re:ゼロ|リゼロ/i,                    aliases: ['리제로', 'Re:Zero'] },
  { id: 'fma',            displayNames: { ko: '강철의 연금술사',   ja: '鋼の錬金術師',            en: 'Fullmetal Alchemist'   }, category: 'shonen',    pattern: /鋼の錬金術師|ハガレン/,               aliases: ['강철의 연금술사', 'Fullmetal Alchemist', 'FMA'] },
  { id: 'code-geass',     displayNames: { ko: '코드기아스',        ja: 'コードギアス',            en: 'Code Geass'            }, category: 'shonen',    pattern: /コードギアス/,                        aliases: ['코드기아스', 'Code Geass'] },
  { id: 'bsd',            displayNames: { ko: '문호 스트레이 독스', ja: '文豪ストレイドッグス',   en: 'Bungo Stray Dogs'      }, category: 'shonen',    pattern: /文豪ストレイドッグス/,                aliases: ['문호 스트레이 독스', 'Bungo Stray Dogs', 'BSD'] },
  { id: 'bocchi',         displayNames: { ko: '봇치 더 록',        ja: 'ぼっち・ざ・ろっく!',    en: 'Bocchi the Rock'       }, category: 'shonen',    pattern: /ぼっち.*ろっく|ぼっちざろっく/i,      aliases: ['봇치 더 록', 'Bocchi the Rock'] },
  { id: 'sakamoto',       displayNames: { ko: '사카모토 데이즈',   ja: 'SAKAMOTO DAYS',           en: 'Sakamoto Days'         }, category: 'shonen',    pattern: /SAKAMOTO DAYS/i,                      aliases: ['사카모토 데이즈'] },
  { id: 'chainsaw',       displayNames: { ko: '체인소 맨',         ja: 'チェンソーマン',          en: 'Chainsaw Man'          }, category: 'shonen',    pattern: /チェンソーマン/,                      aliases: ['체인소 맨', 'Chainsaw Man'] },
  { id: 'spy-family',     displayNames: { ko: '스파이 패밀리',     ja: 'SPY×FAMILY',              en: 'Spy × Family'          }, category: 'shonen',    pattern: /SPY.*FAMILY/i,                        aliases: ['스파이 패밀리', 'Spy x Family'] },
  { id: 'slam-dunk',      displayNames: { ko: '슬램덩크',          ja: 'スラムダンク',            en: 'Slam Dunk'             }, category: 'shonen',    pattern: /スラムダンク|SLAM DUNK/i,            aliases: ['슬램덩크', 'Slam Dunk'] },
  { id: 'conan',          displayNames: { ko: '명탐정 코난',       ja: '名探偵コナン',            en: 'Detective Conan'       }, category: 'shonen',    pattern: /名探偵コナン|Detective Conan/i,       aliases: ['명탐정 코난', '코난', 'Detective Conan'] },
  { id: 'city-hunter',    displayNames: { ko: '시티헌터',          ja: 'シティーハンター',        en: 'City Hunter'           }, category: 'shonen',    pattern: /シティーハンター|CITY HUNTER/i,       aliases: ['시티헌터', 'City Hunter'] },
  { id: 'tenipuri',       displayNames: { ko: '테니스의 왕자님',   ja: 'テニスの王子様',          en: 'Prince of Tennis'      }, category: 'shonen',    pattern: /テニスの王子様|テニプリ/,             aliases: ['테니스의 왕자님', '테니프리', 'Prince of Tennis'] },

  // ── 소녀 만화 / 마법 소녀 ────────────────────────────────
  { id: 'sailor-moon',    displayNames: { ko: '세일러문',          ja: 'セーラームーン',          en: 'Sailor Moon'           }, category: 'shoujo',    pattern: /セーラームーン/,                     aliases: ['미소녀 전사 세일러문', '세일러문', 'Sailor Moon'] },
  { id: 'ccs',            displayNames: { ko: '카드캡터 사쿠라',   ja: 'カードキャプターさくら', en: 'Cardcaptor Sakura'     }, category: 'shoujo',    pattern: /カードキャプターさくら|CCさくら/,    aliases: ['카드캡터 사쿠라', '카드캡터', 'Cardcaptor Sakura'] },
  { id: 'madoka',         displayNames: { ko: '마도카 마기카',     ja: 'まどか☆マギカ',          en: 'Madoka Magica'         }, category: 'shoujo',    pattern: /魔法少女まどか|まどマギ/,            aliases: ['마법소녀 마도카', '마도카 마기카', 'Madoka Magica'] },
  { id: 'precure',        displayNames: { ko: '프리큐어',          ja: 'プリキュア',              en: 'Precure'               }, category: 'shoujo',    pattern: /プリキュア|precure/i,                aliases: ['프리큐어', 'Precure'] },
  { id: 'aikatsu',        displayNames: { ko: '아이카츠',          ja: 'アイカツ!',               en: 'Aikatsu!'              }, category: 'shoujo',    pattern: /アイカツ/,                           aliases: ['아이카츠', 'Aikatsu'] },

  // ── 게임 ─────────────────────────────────────────────────
  { id: 'pokemon',        displayNames: { ko: '포켓몬',            ja: 'ポケモン',                en: 'Pokémon'               }, category: 'games',     pattern: /ポケモン|ポケットモンスター|Pokemon/i,  aliases: ['포켓몬', '포켓 몬스터', 'Pokemon'] },
  { id: 'animal-crossing',displayNames: { ko: '동물의 숲',         ja: 'どうぶつの森',            en: 'Animal Crossing'       }, category: 'games',     pattern: /どうぶつの森|あつまれ.*森/,          aliases: ['동물의 숲', '모여봐요 동물의 숲', 'Animal Crossing'] },
  { id: 'splatoon',       displayNames: { ko: '스플래툰',          ja: 'スプラトゥーン',          en: 'Splatoon'              }, category: 'games',     pattern: /スプラトゥーン|splatoon/i,           aliases: ['스플래툰', 'Splatoon'] },
  { id: 'mario',          displayNames: { ko: '마리오',            ja: 'マリオ',                  en: 'Mario'                 }, category: 'games',     pattern: /マリオ(?!ネット)|Mario/i,            aliases: ['마리오', 'Mario', 'Nintendo'] },
  { id: 'zelda',          displayNames: { ko: '젤다',              ja: 'ゼルダ',                  en: 'Zelda'                 }, category: 'games',     pattern: /ゼルダ|Zelda/i,                      aliases: ['젤다', 'Zelda', 'Link'] },
  { id: 'mh',             displayNames: { ko: '몬스터 헌터',       ja: 'モンスターハンター',      en: 'Monster Hunter'        }, category: 'games',     pattern: /モンスターハンター|モンハン/,        aliases: ['몬스터 헌터', '몬헌', 'Monster Hunter'] },
  { id: 'monster-strike', displayNames: { ko: '몬스터 스트라이크', ja: 'モンスターストライク',    en: 'Monster Strike'        }, category: 'games',     pattern: /モンスターストライク|モンスト/,      aliases: ['몬스터 스트라이크', '몬스트', 'Monster Strike'] },
  { id: 'hsr',            displayNames: { ko: '스타레일',          ja: 'スターレイル',            en: 'Honkai: Star Rail'     }, category: 'games',     pattern: /崩壊.*スターレイル/,                 aliases: ['붕괴: 스타레일', '스타레일', 'Honkai: Star Rail', 'HSR'] },
  { id: 'genshin',        displayNames: { ko: '원신',              ja: '原神',                    en: 'Genshin Impact'        }, category: 'games',     pattern: /原神|Genshin/i,                      aliases: ['원신', 'Genshin Impact'] },
  { id: 'blue-archive',   displayNames: { ko: '블루 아카이브',     ja: 'ブルーアーカイブ',        en: 'Blue Archive'          }, category: 'games',     pattern: /ブルーアーカイブ|ブルアカ/,         aliases: ['블루 아카이브', '블루아카', 'Blue Archive'] },
  { id: 'identity-v',     displayNames: { ko: '아이덴티티 V',      ja: 'IdentityⅤ',               en: 'Identity V'            }, category: 'games',     pattern: /IdentityⅤ|第五人格/,                 aliases: ['아이덴티티V', 'Identity V', '제5인격'] },
  { id: 'ff',             displayNames: { ko: '파이널 판타지',     ja: 'ファイナルファンタジー',  en: 'Final Fantasy'         }, category: 'games',     pattern: /ファイナルファンタジー|FINAL FANTASY/i, aliases: ['파이널 판타지', 'Final Fantasy', 'FF'] },
  { id: 'fate',           displayNames: { ko: 'Fate',              ja: 'Fate',                    en: 'Fate'                  }, category: 'games',     pattern: /Fate\/|フェイト/i,                   aliases: ['페이트', 'Fate'] },
  { id: 'pjsk',           displayNames: { ko: '프로세카',          ja: 'プロジェクトセカイ',      en: 'Project Sekai'         }, category: 'games',     pattern: /プロセカ|プロジェクトセカイ/,       aliases: ['프로세카', 'Project Sekai', 'PJSK'] },
  { id: 'uma-musume',     displayNames: { ko: '우마무스메',        ja: 'ウマ娘',                  en: 'Uma Musume'            }, category: 'games',     pattern: /ウマ娘/,                             aliases: ['우마무스메', 'Uma Musume'] },
  { id: 'nijisanji',      displayNames: { ko: '니지산지',          ja: 'にじさんじ',              en: 'Nijisanji'             }, category: 'games',     pattern: /にじさんじ/,                         aliases: ['니지산지', 'Nijisanji'] },

  // ── 로봇 / SF ─────────────────────────────────────────────
  { id: 'gundam',         displayNames: { ko: '건담',              ja: 'ガンダム',                en: 'Gundam'                }, category: 'robot',     pattern: /ガンダム|Gundam/i,                   aliases: ['건담', 'Gundam', '기동전사'] },
  { id: 'evangelion',     displayNames: { ko: '에반게리온',        ja: 'エヴァンゲリオン',        en: 'Evangelion'            }, category: 'robot',     pattern: /エヴァンゲリオン|エヴァ|Evangelion/i, aliases: ['에반게리온', '에바', 'Evangelion', 'Eva', 'NGE'] },
  { id: 'macross',        displayNames: { ko: '마크로스',          ja: 'マクロス',                en: 'Macross'               }, category: 'robot',     pattern: /マクロス/,                           aliases: ['마크로스', 'Macross'] },
  { id: 'girls-panzer',   displayNames: { ko: '걸즈 앤 판처',     ja: 'ガールズ＆パンツァー',    en: 'Girls und Panzer'      }, category: 'robot',     pattern: /ガールズ.*パンツァー|ガルパン/,      aliases: ['걸즈 앤 판처', '걸즈파', 'Girls und Panzer'] },
  { id: 'tiger-bunny',    displayNames: { ko: '타이거 앤 버니',   ja: 'TIGER & BUNNY',           en: 'Tiger & Bunny'         }, category: 'robot',     pattern: /TIGER.*BUNNY/i,                      aliases: ['타이거 앤 버니', 'Tiger & Bunny'] },

  // ── 특촬 / 어린이 ─────────────────────────────────────────
  { id: 'chiikawa',       displayNames: { ko: '치이카와',          ja: 'ちいかわ',                en: 'Chiikawa'              }, category: 'tokusatsu', pattern: /ちいかわ|チイカワ|Chiikawa/i,         aliases: ['치이카와', 'Chiikawa', 'ちいかわ'] },
  { id: 'kamen-rider',    displayNames: { ko: '가면라이더',        ja: '仮面ライダー',            en: 'Kamen Rider'           }, category: 'tokusatsu', pattern: /仮面ライダー/,                       aliases: ['가면라이더', 'Kamen Rider'] },
  { id: 'super-sentai',   displayNames: { ko: '슈퍼 전대',        ja: 'スーパー戦隊',            en: 'Super Sentai'          }, category: 'tokusatsu', pattern: /スーパー戦隊/,                       aliases: ['슈퍼 전대', 'Super Sentai', 'Power Rangers'] },
  { id: 'doraemon',       displayNames: { ko: '도라에몽',          ja: 'ドラえもん',              en: 'Doraemon'              }, category: 'tokusatsu', pattern: /ドラえもん/,                         aliases: ['도라에몽', 'Doraemon'] },
  { id: 'shinchan',       displayNames: { ko: '짱구는 못말려',    ja: 'クレヨンしんちゃん',      en: 'Crayon Shin-chan'       }, category: 'tokusatsu', pattern: /クレヨンしんちゃん/,                 aliases: ['짱구는 못말려', '짱구', 'Crayon Shin-chan'] },
  { id: 'molcar',         displayNames: { ko: '뿌이뿌이 몰카',    ja: 'PUI PUI モルカー',        en: 'PUI PUI Molcar'        }, category: 'tokusatsu', pattern: /PUI PUI モルカー/,                   aliases: ['뿌이뿌이 몰카', '몰카', 'Molcar'] },

  // ── 아이돌 / 음악 ─────────────────────────────────────────
  { id: 'love-live',      displayNames: { ko: '러브 라이브',       ja: 'ラブライブ!',             en: 'Love Live!'            }, category: 'idol',      pattern: /ラブライブ|Love Live/i,              aliases: ['러브 라이브', '러브라이브', 'Love Live'] },
  { id: 'idolmaster',     displayNames: { ko: '아이돌마스터',      ja: 'アイドルマスター',        en: 'Idolmaster'            }, category: 'idol',      pattern: /アイドルマスター|アイマス/,          aliases: ['아이돌마스터', '아이마스', 'Idolmaster'] },
  { id: 'utapri',         displayNames: { ko: '우타프리',          ja: 'うたの☆プリンスさまっ♪', en: 'Uta no Prince-sama'    }, category: 'idol',      pattern: /うたの.*プリンスさまっ|うたプリ/,   aliases: ['우타 프리', '우타프리', 'Uta no Prince-sama'] },
  { id: 'ensemble-stars', displayNames: { ko: '앙상블 스타즈',     ja: 'あんさんぶるスターズ!!', en: 'Ensemble Stars'        }, category: 'idol',      pattern: /あんさんぶるスターズ|あんスタ/,      aliases: ['앙상블 스타즈', '앙스타', 'Ensemble Stars'] },
  { id: 'hypnosis-mic',   displayNames: { ko: '힙노시스 마이크',   ja: 'ヒプノシスマイク',        en: 'Hypnosis Mic'          }, category: 'idol',      pattern: /ヒプノシスマイク|ヒプマイク/,        aliases: ['힙노시스 마이크', '힙마이크', 'Hypnosis Mic'] },
  { id: 'hololive',       displayNames: { ko: '홀로라이브',        ja: 'ホロライブ',              en: 'Hololive'              }, category: 'idol',      pattern: /ホロライブ|hololive/i,               aliases: ['홀로라이브', 'Hololive'] },

  // ── 디즈니 / 서양 ─────────────────────────────────────────
  { id: 'disney',         displayNames: { ko: '디즈니',            ja: 'ディズニー',              en: 'Disney'                }, category: 'western',   pattern: /ディズニー|Disney/i,                 aliases: ['디즈니', 'Disney'] },
  { id: 'twst',           displayNames: { ko: '트위스티드 원더랜드', ja: 'ツイステッドワンダーランド', en: 'Twisted Wonderland' }, category: 'western',   pattern: /ツイステッドワンダーランド|ツイステ/, aliases: ['트위스티드 원더랜드', '트위스티드', 'Twisted Wonderland', 'Twst'] },
  { id: 'star-wars',      displayNames: { ko: '스타워즈',          ja: 'スター・ウォーズ',        en: 'Star Wars'             }, category: 'western',   pattern: /スター.*ウォーズ|Star Wars/i,        aliases: ['스타워즈', 'Star Wars'] },
  { id: 'marvel',         displayNames: { ko: '마블',              ja: 'マーベル',                en: 'Marvel'                }, category: 'western',   pattern: /マーベル|Marvel/i,                   aliases: ['마블', 'Marvel'] },
]

/** Groups IP_LIST by category, preserving insertion order */
export const IP_CATEGORIES: { category: string; entries: IpEntry[] }[] = (() => {
  const map = new Map<string, IpEntry[]>()
  for (const entry of IP_LIST) {
    if (!map.has(entry.category)) map.set(entry.category, [])
    map.get(entry.category)!.push(entry)
  }
  return Array.from(map.entries()).map(([category, entries]) => ({ category, entries }))
})()

/** Returns search alias strings to append to a product's searchText */
export function getAliases(title: string): string[] {
  const aliases: string[] = []
  for (const entry of IP_LIST) {
    if (entry.pattern.test(title)) aliases.push(...entry.aliases)
  }
  return aliases
}

/** Returns matching IP ids for a product title */
export function getIpTags(title: string): string[] {
  return IP_LIST.filter(e => e.pattern.test(title)).map(e => e.id)
}
