// Standards checked against the source table in docs/context/囚徒健身60关标准核验.md.
export const CHALLENGE_SOURCE =
  'https://books.out.csli.me/Fitness/Convict%20Conditioning/Convict%20Conditioning%20-%20Paul%20Wade.pdf'
export const challengeRoutes = [
  {
    id: 'pushup',
    name: '俯卧撑',
    subtitle: '胸 · 肩 · 肱三头肌',
    icon: '↗',
    levels: [
      {
        id: 'cc-pushup-01',
        step: 1,
        name: '墙壁俯卧撑',
        englishName: 'Wall Pushups',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 25,
          },
          progression: {
            sets: 3,
            value: 50,
          },
        },
        tip: '身体保持一线，屈肘靠近墙面后推回。',
        sourcePage: 73,
        version: 'cc-v1',
      },
      {
        id: 'cc-pushup-02',
        step: 2,
        name: '上斜俯卧撑',
        englishName: 'Incline Pushups',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 20,
          },
          progression: {
            sets: 3,
            value: 40,
          },
        },
        tip: '双手支撑稳定的高台，身体保持一线完成推起。',
        sourcePage: 75,
        version: 'cc-v1',
      },
      {
        id: 'cc-pushup-03',
        step: 3,
        name: '膝盖俯卧撑',
        englishName: 'Kneeling Pushups',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 15,
          },
          progression: {
            sets: 3,
            value: 30,
          },
        },
        tip: '以膝盖支撑，躯干与大腿保持对齐。',
        sourcePage: 77,
        version: 'cc-v1',
      },
      {
        id: 'cc-pushup-04',
        step: 4,
        name: '半俯卧撑',
        englishName: 'Half Pushups',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 8,
          },
          intermediate: {
            sets: 2,
            value: 12,
          },
          progression: {
            sets: 2,
            value: 25,
          },
        },
        tip: '只完成俯卧撑上半程，保持躯干稳定。',
        sourcePage: 79,
        version: 'cc-v1',
      },
      {
        id: 'cc-pushup-05',
        step: 5,
        name: '标准俯卧撑',
        englishName: 'Full Pushups',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 20,
          },
        },
        tip: '全程控制下降至胸部接近地面，再推回。',
        sourcePage: 81,
        version: 'cc-v1',
      },
      {
        id: 'cc-pushup-06',
        step: 6,
        name: '窄距俯卧撑',
        englishName: 'Close Pushups',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 20,
          },
        },
        tip: '双手靠近，完整屈肘和推起。',
        sourcePage: 83,
        version: 'cc-v1',
      },
      {
        id: 'cc-pushup-07',
        step: 7,
        name: '偏重俯卧撑',
        englishName: 'Uneven Pushups',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 20,
          },
        },
        tip: '一手放在高处，另一手在地面；换侧分别完成。',
        sourcePage: 85,
        version: 'cc-v1',
      },
      {
        id: 'cc-pushup-08',
        step: 8,
        name: '单臂半俯卧撑',
        englishName: 'Half One-Arm Pushups',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 20,
          },
        },
        tip: '单手支撑，完成上半程；左右分别记录。',
        sourcePage: 87,
        version: 'cc-v1',
      },
      {
        id: 'cc-pushup-09',
        step: 9,
        name: '杠杆俯卧撑',
        englishName: 'Lever Pushups',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 20,
          },
        },
        tip: '辅助臂向侧面伸直，控制下降推起；两侧分别完成。',
        sourcePage: 89,
        version: 'cc-v1',
      },
      {
        id: 'cc-pushup-10',
        step: 10,
        name: '单臂俯卧撑',
        englishName: 'One-Arm Pushups',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          elite: {
            sets: 1,
            value: 100,
          },
        },
        tip: '单手支撑完整下压推起，保持躯干稳定，左右分别完成。',
        sourcePage: 91,
        version: 'cc-v1',
      },
    ],
  },
  {
    id: 'squat',
    name: '深蹲',
    subtitle: '腿部力量 · 平衡',
    icon: '↓',
    levels: [
      {
        id: 'cc-squat-01',
        step: 1,
        name: '肩倒立深蹲',
        englishName: 'Shoulderstand Squats',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 25,
          },
          progression: {
            sets: 3,
            value: 50,
          },
        },
        tip: '肩背着地、双手托腰，双腿同步屈伸。',
        sourcePage: 115,
        version: 'cc-v1',
      },
      {
        id: 'cc-squat-02',
        step: 2,
        name: '折刀深蹲',
        englishName: 'Jackknife Squats',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 20,
          },
          progression: {
            sets: 3,
            value: 40,
          },
        },
        tip: '扶稳定物体、髋部折叠，用双腿力量蹲起。',
        sourcePage: 117,
        version: 'cc-v1',
      },
      {
        id: 'cc-squat-03',
        step: 3,
        name: '支撑深蹲',
        englishName: 'Supported Squats',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 15,
          },
          progression: {
            sets: 3,
            value: 30,
          },
        },
        tip: '扶稳定支撑完成深蹲，控制辅助力度。',
        sourcePage: 119,
        version: 'cc-v1',
      },
      {
        id: 'cc-squat-04',
        step: 4,
        name: '半深蹲',
        englishName: 'Half Squats',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 8,
          },
          intermediate: {
            sets: 2,
            value: 35,
          },
          progression: {
            sets: 2,
            value: 50,
          },
        },
        tip: '下蹲到大腿接近平行地面再站起。',
        sourcePage: 121,
        version: 'cc-v1',
      },
      {
        id: 'cc-squat-05',
        step: 5,
        name: '标准深蹲',
        englishName: 'Full Squats',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 30,
          },
        },
        tip: '脚跟保持着地，下蹲至完整幅度再站起。',
        sourcePage: 123,
        version: 'cc-v1',
      },
      {
        id: 'cc-squat-06',
        step: 6,
        name: '窄距深蹲',
        englishName: 'Close Squats',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 20,
          },
        },
        tip: '双脚靠拢完成完整深蹲，保持平衡。',
        sourcePage: 125,
        version: 'cc-v1',
      },
      {
        id: 'cc-squat-07',
        step: 7,
        name: '偏重深蹲',
        englishName: 'Uneven Squats',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 20,
          },
        },
        tip: '一脚放在高处、另一脚承担主要负荷；两侧分别完成。',
        sourcePage: 127,
        version: 'cc-v1',
      },
      {
        id: 'cc-squat-08',
        step: 8,
        name: '单腿半深蹲',
        englishName: 'Half One-Leg Squats',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 20,
          },
        },
        tip: '单腿站立，下蹲至半程再起身；两侧分别完成。',
        sourcePage: 130,
        version: 'cc-v1',
      },
      {
        id: 'cc-squat-09',
        step: 9,
        name: '辅助单腿深蹲',
        englishName: 'Assisted One-Leg Squats',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 20,
          },
        },
        tip: '单腿深蹲，底部借助手部支撑起身；两侧分别完成。',
        sourcePage: 132,
        version: 'cc-v1',
      },
      {
        id: 'cc-squat-10',
        step: 10,
        name: '单腿深蹲',
        englishName: 'One-Leg Squats',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          elite: {
            sets: 2,
            value: 50,
          },
        },
        tip: '一腿悬空，支撑腿完成完整蹲起；两侧分别完成。',
        sourcePage: 134,
        version: 'cc-v1',
      },
    ],
  },
  {
    id: 'pullup',
    name: '引体向上',
    subtitle: '背部 · 握力 · 肱二头肌',
    icon: '↑',
    levels: [
      {
        id: 'cc-pullup-01',
        step: 1,
        name: '垂直引体',
        englishName: 'Vertical Pulls',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 20,
          },
          progression: {
            sets: 3,
            value: 40,
          },
        },
        tip: '抓住稳定的竖直支撑，身体后倾后拉回。',
        sourcePage: 157,
        version: 'cc-v1',
      },
      {
        id: 'cc-pullup-02',
        step: 2,
        name: '水平引体',
        englishName: 'Horizontal Pulls',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 20,
          },
          progression: {
            sets: 3,
            value: 30,
          },
        },
        tip: '身体在稳定横杆下方，保持对齐向上拉近横杆。',
        sourcePage: 159,
        version: 'cc-v1',
      },
      {
        id: 'cc-pullup-03',
        step: 3,
        name: '折刀引体',
        englishName: 'Jackknife Pulls',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 15,
          },
          progression: {
            sets: 3,
            value: 20,
          },
        },
        tip: '脚放在稳定高处辅助，完成完整引体动作。',
        sourcePage: 161,
        version: 'cc-v1',
      },
      {
        id: 'cc-pullup-04',
        step: 4,
        name: '半引体向上',
        englishName: 'Half Pullups',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 8,
          },
          intermediate: {
            sets: 2,
            value: 11,
          },
          progression: {
            sets: 2,
            value: 15,
          },
        },
        tip: '从肘部约直角的位置拉至下巴过杆，再回到半程。',
        sourcePage: 163,
        version: 'cc-v1',
      },
      {
        id: 'cc-pullup-05',
        step: 5,
        name: '标准引体向上',
        englishName: 'Full Pullups',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 8,
          },
          progression: {
            sets: 2,
            value: 10,
          },
        },
        tip: '从手臂伸展位置拉至下巴过杆，控制下降。',
        sourcePage: 165,
        version: 'cc-v1',
      },
      {
        id: 'cc-pullup-06',
        step: 6,
        name: '窄距引体向上',
        englishName: 'Close Pullups',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 8,
          },
          progression: {
            sets: 2,
            value: 10,
          },
        },
        tip: '双手靠近握杆，完成完整引体动作。',
        sourcePage: 167,
        version: 'cc-v1',
      },
      {
        id: 'cc-pullup-07',
        step: 7,
        name: '偏重引体向上',
        englishName: 'Uneven Pullups',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 7,
          },
          progression: {
            sets: 2,
            value: 9,
          },
        },
        tip: '一手握杆、另一手握住该侧手腕辅助；两侧分别完成。',
        sourcePage: 169,
        version: 'cc-v1',
      },
      {
        id: 'cc-pullup-08',
        step: 8,
        name: '单臂半引体向上',
        englishName: 'Half One-Arm Pullups',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 4,
          },
          intermediate: {
            sets: 2,
            value: 6,
          },
          progression: {
            sets: 2,
            value: 8,
          },
        },
        tip: '单臂完成引体上半程；两侧分别完成。',
        sourcePage: 171,
        version: 'cc-v1',
      },
      {
        id: 'cc-pullup-09',
        step: 9,
        name: '辅助单臂引体向上',
        englishName: 'Assisted One-Arm Pullups',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 3,
          },
          intermediate: {
            sets: 2,
            value: 5,
          },
          progression: {
            sets: 2,
            value: 7,
          },
        },
        tip: '另一手抓毛巾或绳辅助单臂引体；两侧分别完成。',
        sourcePage: 173,
        version: 'cc-v1',
      },
      {
        id: 'cc-pullup-10',
        step: 10,
        name: '单臂引体向上',
        englishName: 'One-Arm Pullups',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 1,
          },
          intermediate: {
            sets: 2,
            value: 3,
          },
          elite: {
            sets: 2,
            value: 6,
          },
        },
        tip: '单手握杆完成完整引体，左右分别记录。',
        sourcePage: 175,
        version: 'cc-v1',
      },
    ],
  },
  {
    id: 'legraise',
    name: '举腿',
    subtitle: '腹部 · 核心控制',
    icon: '⌁',
    levels: [
      {
        id: 'cc-legraise-01',
        step: 1,
        name: '坐姿屈膝',
        englishName: 'Knee Tucks',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 25,
          },
          progression: {
            sets: 3,
            value: 40,
          },
        },
        tip: '坐在稳定座位边缘，双膝收向胸前后伸出。',
        sourcePage: 193,
        version: 'cc-v1',
      },
      {
        id: 'cc-legraise-02',
        step: 2,
        name: '平卧抬膝',
        englishName: 'Flat Knee Raises',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 20,
          },
          progression: {
            sets: 3,
            value: 35,
          },
        },
        tip: '仰卧、膝约直角，保持角度抬起再放下，脚不落地。',
        sourcePage: 196,
        version: 'cc-v1',
      },
      {
        id: 'cc-legraise-03',
        step: 3,
        name: '平卧屈举腿',
        englishName: 'Flat Bent Leg Raises',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 15,
          },
          progression: {
            sets: 3,
            value: 30,
          },
        },
        tip: '仰卧、膝保持约 45 度屈曲，双腿同步抬放。',
        sourcePage: 198,
        version: 'cc-v1',
      },
      {
        id: 'cc-legraise-04',
        step: 4,
        name: '平卧蛙举腿',
        englishName: 'Flat Frog Raises',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 8,
          },
          intermediate: {
            sets: 2,
            value: 15,
          },
          progression: {
            sets: 3,
            value: 25,
          },
        },
        tip: '先屈腿抬起，在顶部伸直，再以直腿缓慢放下。',
        sourcePage: 200,
        version: 'cc-v1',
      },
      {
        id: 'cc-legraise-05',
        step: 5,
        name: '平卧直举腿',
        englishName: 'Flat Straight Leg Raises',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 20,
          },
        },
        tip: '双腿伸直，从接近地面抬至竖直，再控制放下。',
        sourcePage: 202,
        version: 'cc-v1',
      },
      {
        id: 'cc-legraise-06',
        step: 6,
        name: '悬垂屈膝',
        englishName: 'Hanging Knee Raises',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 15,
          },
        },
        tip: '悬垂时双膝向上收起，控制下降与摆动。',
        sourcePage: 204,
        version: 'cc-v1',
      },
      {
        id: 'cc-legraise-07',
        step: 7,
        name: '悬垂屈举腿',
        englishName: 'Hanging Bent Leg Raises',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 15,
          },
        },
        tip: '悬垂、保持膝部屈曲角度，双腿抬至髋部高度。',
        sourcePage: 206,
        version: 'cc-v1',
      },
      {
        id: 'cc-legraise-08',
        step: 8,
        name: '悬垂蛙举腿',
        englishName: 'Hanging Frog Raises',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 15,
          },
        },
        tip: '屈腿抬起，在顶部伸直，再以直腿缓慢放下。',
        sourcePage: 208,
        version: 'cc-v1',
      },
      {
        id: 'cc-legraise-09',
        step: 9,
        name: '悬垂半举腿',
        englishName: 'Partial Straight Leg Raises',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 15,
          },
        },
        tip: '直腿从约 45 度抬至水平，再回到 45 度。',
        sourcePage: 211,
        version: 'cc-v1',
      },
      {
        id: 'cc-legraise-10',
        step: 10,
        name: '悬垂直举腿',
        englishName: 'Hanging Straight Leg Raises',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          elite: {
            sets: 2,
            value: 30,
          },
        },
        tip: '保持双腿伸直，从垂直悬垂抬至水平再放下。',
        sourcePage: 213,
        version: 'cc-v1',
      },
    ],
  },
  {
    id: 'bridge',
    name: '桥',
    subtitle: '后侧链 · 脊柱控制',
    icon: '⌒',
    levels: [
      {
        id: 'cc-bridge-01',
        step: 1,
        name: '短桥',
        englishName: 'Short Bridges',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 25,
          },
          progression: {
            sets: 3,
            value: 50,
          },
        },
        tip: '仰卧屈膝，以双脚与肩部支撑抬髋，再控制放下。',
        sourcePage: 236,
        version: 'cc-v1',
      },
      {
        id: 'cc-bridge-02',
        step: 2,
        name: '直桥',
        englishName: 'Straight Bridges',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 2,
            value: 20,
          },
          progression: {
            sets: 3,
            value: 40,
          },
        },
        tip: '坐姿双手在身后支撑，伸腿抬髋形成直桥。',
        sourcePage: 238,
        version: 'cc-v1',
      },
      {
        id: 'cc-bridge-03',
        step: 3,
        name: '高低桥',
        englishName: 'Angled Bridges',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 8,
          },
          intermediate: {
            sets: 2,
            value: 15,
          },
          progression: {
            sets: 3,
            value: 30,
          },
        },
        tip: '双手支撑稳定高处，抬身成桥再控制下降。',
        sourcePage: 240,
        version: 'cc-v1',
      },
      {
        id: 'cc-bridge-04',
        step: 4,
        name: '顶桥',
        englishName: 'Head Bridges',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 8,
          },
          intermediate: {
            sets: 2,
            value: 15,
          },
          progression: {
            sets: 2,
            value: 25,
          },
        },
        tip: '从桥位屈肘下降至头部轻触地面，再推回桥位。',
        sourcePage: 242,
        version: 'cc-v1',
      },
      {
        id: 'cc-bridge-05',
        step: 5,
        name: '半桥',
        englishName: 'Half Bridges',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 8,
          },
          intermediate: {
            sets: 2,
            value: 15,
          },
          progression: {
            sets: 2,
            value: 20,
          },
        },
        tip: '借助背下方的支撑控制幅度，完成半程桥起落。',
        sourcePage: 244,
        version: 'cc-v1',
      },
      {
        id: 'cc-bridge-06',
        step: 6,
        name: '标准桥',
        englishName: 'Full Bridges',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 6,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 15,
          },
        },
        tip: '从仰卧推起到完整桥位，再控制下降。',
        sourcePage: 246,
        version: 'cc-v1',
      },
      {
        id: 'cc-bridge-07',
        step: 7,
        name: '下行桥',
        englishName: 'Wall Walking Bridges Down',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 3,
          },
          intermediate: {
            sets: 2,
            value: 6,
          },
          progression: {
            sets: 2,
            value: 10,
          },
        },
        tip: '沿墙下行到双手着地的桥位，落地站起后开始下一次。',
        sourcePage: 248,
        version: 'cc-v1',
      },
      {
        id: 'cc-bridge-08',
        step: 8,
        name: '上行桥',
        englishName: 'Wall Walking Bridges Up',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 2,
          },
          intermediate: {
            sets: 2,
            value: 4,
          },
          progression: {
            sets: 2,
            value: 8,
          },
        },
        tip: '站立沿墙下行到桥位，再沿墙上行恢复独立站姿，整个循环计一次。',
        sourcePage: 251,
        version: 'cc-v1',
      },
      {
        id: 'cc-bridge-09',
        step: 9,
        name: '合桥',
        englishName: 'Closing Bridges',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 1,
          },
          intermediate: {
            sets: 2,
            value: 3,
          },
          progression: {
            sets: 2,
            value: 6,
          },
        },
        tip: '从站立后屈至桥位，落地再站起；无需从桥位直接起身。',
        sourcePage: 253,
        version: 'cc-v1',
      },
      {
        id: 'cc-bridge-10',
        step: 10,
        name: '铁板桥／站立桥',
        englishName: 'Stand-to-Stand Bridges',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 1,
          },
          intermediate: {
            sets: 2,
            value: 3,
          },
          elite: {
            sets: 2,
            value: 10,
            upper: 30,
          },
        },
        tip: '站立下桥，再从桥位直接恢复站姿，完整循环计一次；不是静态保持。',
        sourcePage: 255,
        version: 'cc-v1',
      },
    ],
  },
  {
    id: 'handstand',
    name: '倒立撑',
    subtitle: '肩部力量 · 倒立控制',
    icon: '↟',
    levels: [
      {
        id: 'cc-handstand-01',
        step: 1,
        name: '靠墙顶立',
        englishName: 'Wall Headstands',
        mode: 'time',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 30,
          },
          intermediate: {
            sets: 1,
            value: 60,
          },
          progression: {
            sets: 1,
            value: 120,
          },
        },
        tip: '靠墙头手支撑的顶立；头部参与支撑，保持时长不可中断累计。',
        sourcePage: 276,
        version: 'cc-v1',
      },
      {
        id: 'cc-handstand-02',
        step: 2,
        name: '乌鸦式',
        englishName: 'Crow Stands',
        mode: 'time',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 10,
          },
          intermediate: {
            sets: 1,
            value: 30,
          },
          progression: {
            sets: 1,
            value: 60,
          },
        },
        tip: '双手撑地、双膝靠在上臂，脚离地保持平衡；连续保持。',
        sourcePage: 278,
        version: 'cc-v1',
      },
      {
        id: 'cc-handstand-03',
        step: 3,
        name: '靠墙倒立',
        englishName: 'Wall Handstands',
        mode: 'time',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 30,
          },
          intermediate: {
            sets: 1,
            value: 60,
          },
          progression: {
            sets: 1,
            value: 120,
          },
        },
        tip: '双手支撑、头不着地，脚跟靠墙；连续保持。',
        sourcePage: 280,
        version: 'cc-v1',
      },
      {
        id: 'cc-handstand-04',
        step: 4,
        name: '半倒立撑',
        englishName: 'Half Handstand Pushups',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 20,
          },
        },
        tip: '靠墙双手倒立，只下降到半程再撑起。',
        sourcePage: 282,
        version: 'cc-v1',
      },
      {
        id: 'cc-handstand-05',
        step: 5,
        name: '标准倒立撑',
        englishName: 'Handstand Pushups',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 10,
          },
          progression: {
            sets: 2,
            value: 15,
          },
        },
        tip: '靠墙双手倒立，控制下降至头部轻触地面再撑起。',
        sourcePage: 285,
        version: 'cc-v1',
      },
      {
        id: 'cc-handstand-06',
        step: 6,
        name: '窄距倒立撑',
        englishName: 'Close Handstand Pushups',
        mode: 'reps',
        unilateral: false,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 9,
          },
          progression: {
            sets: 2,
            value: 12,
          },
        },
        tip: '靠墙、双手靠拢，完成倒立撑。',
        sourcePage: 287,
        version: 'cc-v1',
      },
      {
        id: 'cc-handstand-07',
        step: 7,
        name: '偏重倒立撑',
        englishName: 'Uneven Handstand Pushups',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 5,
          },
          intermediate: {
            sets: 2,
            value: 8,
          },
          progression: {
            sets: 2,
            value: 10,
          },
        },
        tip: '靠墙，一手放在高处；完成倒立撑并换侧。',
        sourcePage: 289,
        version: 'cc-v1',
      },
      {
        id: 'cc-handstand-08',
        step: 8,
        name: '单臂半倒立撑',
        englishName: 'Half One-Arm Handstand Pushups',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 4,
          },
          intermediate: {
            sets: 2,
            value: 6,
          },
          progression: {
            sets: 2,
            value: 8,
          },
        },
        tip: '靠墙单手支撑，下降到半程再撑起；两侧分别完成。',
        sourcePage: 292,
        version: 'cc-v1',
      },
      {
        id: 'cc-handstand-09',
        step: 9,
        name: '杠杆倒立撑',
        englishName: 'Lever Handstand Pushups',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 3,
          },
          intermediate: {
            sets: 2,
            value: 4,
          },
          progression: {
            sets: 2,
            value: 6,
          },
        },
        tip: '靠墙，辅助手以手背接地、臂向前伸直；两侧分别完成。',
        sourcePage: 295,
        version: 'cc-v1',
      },
      {
        id: 'cc-handstand-10',
        step: 10,
        name: '单臂倒立撑',
        englishName: 'One-Arm Handstand Pushups',
        mode: 'reps',
        unilateral: true,
        standards: {
          beginner: {
            sets: 1,
            value: 1,
          },
          intermediate: {
            sets: 2,
            value: 2,
          },
          elite: {
            sets: 1,
            value: 5,
          },
        },
        tip: '原书版本：靠墙、脚跟接触墙面，可用腿部蹬伸助力；两侧分别完成。',
        sourcePage: 298,
        version: 'cc-v1',
      },
    ],
  },
]

export const challengeLevels = challengeRoutes.flatMap((route) => route.levels)
export const stageLabels = {
  beginner: '入门',
  intermediate: '中级',
  progression: '进阶',
  elite: '精英',
}
