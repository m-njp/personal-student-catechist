import type { BayanContent, Choice, Line } from "@/features/bayan/content";

const say = (speaker: string, text: string): Line => ({ speaker, text });
const right = (text: string): Choice => ({ text });
const wrong = (text: string, speaker: string, hint: string): Choice => ({ text, hint: say(speaker, hint) });

/**
 * Every word Build Our Bayan shows, in English. Each leader sounds like themselves: Ate Bea is a
 * cheerful big sister, Tatay jokes, Nanay fusses, the principal runs a class, the President gives a
 * speech, and the parish priest blesses. Lines stay short and keep the class on the goal.
 * Dialogue, wrong choices, the verse wording, the cards, and the plaques are drafts for the teacher
 * to review. Strings starting with TODO are still to be supplied and show as "to be added".
 */
export const bayan: BayanContent = {
  stages: [
    {
      title: "Icebreaker",
      instructions: "Find the leader of each community. Look for the question marks.",
      start: [],
      end: {
        title: "Every community has leaders",
        body: "Our home, our school, and our country each have leaders who guide us and help us grow. Our parish has a leader too.",
      },
    },
    {
      title: "Sacred scripture",
      instructions: "Talk to Father by the church. Read the verse, then find each part of the church.",
      start: ["Our town is complete. Let us look closer at our church.", "Father will read us a verse about God's household. Go talk to him!"],
      end: {
        title: "Built on Christ",
        body: "The apostles and prophets are the foundation. All of us are the walls. Christ Jesus is the capstone who holds the whole Church together.",
      },
    },
    {
      title: "Church teaching",
      instructions: "Visit St. Peter by the door, then meet each leader inside.",
      start: ["Our church is complete, and Father opened its doors!", "Go inside and meet the leaders who guide the whole Church."],
      end: {
        title: "The leaders of the Church",
        body: "Jesus still guides His Church through the Pope, the bishops, our priests, and our deacons. Every baptized person, like you, has a part to play.",
      },
    },
    {
      title: "Truths to remember",
      instructions: "Open the plaques by the monument, one at a time.",
      start: ["Three plaques stand by the monument in the park.", "Open them one at a time, starting with the first one on the left."],
      end: {
        title: "Truths to remember",
        body: "Jesus chose the leaders of His Church. We all share in its mission. We pray for everyone who leads us.",
      },
    },
    {
      title: "Serve our town",
      instructions: "Each group finishes its sentence for its building.",
      start: ["Now it's our turn to serve our bayan.", "Each group, finish your sentence for your building's banner."],
    },
  ],

  title: {
    title: "Build Our Bayan",
    body: "Find each leader of the community and together, we will build our town.",
  },

  recall: {
    title: "Last time",
    body: "Last time, we became one community and built a wall. Today, our community builds its whole town.",
  },

  guide: {
    id: "bea",
    opening: [
      "Hi! I'm Ate Bea. Remember last time? The Holy Spirit made us one community, and we built a wall together.",
      "Today we build our whole bayan. But nothing gets built without someone to guide us.",
      "Let's find the leaders of our home, our school, our country, and our parish!",
      "Walk to anyone with a question mark and talk to them. Use the arrow keys, or tap where to go.",
    ],
    idle: ["Psst! Follow the yellow arrow to the next leader.", "Look for someone with a question mark!"],
    allFound: ["You found all four leaders! Look how our bayan has grown."],
  },

  people: {
    pupil: { name: "You", sprite: "pupil" },
    bea: { name: "Ate Bea", sprite: "guide" },
    tatay: { name: "Tatay", sprite: "father" },
    nanay: { name: "Nanay", sprite: "mother" },
    principal: { name: "Principal Santos", sprite: "principal" },
    teacher: { name: "Teacher Grace", sprite: "teacher" },
    president: { name: "The President", sprite: "president" },
    priest: { name: "Father", sprite: "priest" },
    "mang-jose": { name: "Mang Jose", sprite: "builder-jose" },
    "aling-rosa": { name: "Aling Rosa", sprite: "builder-rosa" },
    "mang-tonyo": { name: "Mang Tonyo", sprite: "builder-tonyo" },
    "ate-liza": { name: "Ate Liza", sprite: "builder-liza" },
    "kuya-dan": { name: "Kuya Dan", sprite: "builder-dan" },
    "mang-pedro": { name: "Mang Pedro", sprite: "builder-pedro" },
    "aling-cora": { name: "Aling Cora", sprite: "builder-cora" },
    "lolo-ramon": { name: "Lolo Ramon", sprite: "builder-ramon" },
    paolo: { name: "Paolo", sprite: "kid-a" },
    joy: { name: "Joy", sprite: "kid-b" },
    "aling-nena": { name: "Aling Nena", sprite: "tindera" },
    "mang-ben": { name: "Mang Ben", sprite: "vendor" },
    bantay: { name: "Bantay", sprite: "dog" },
    muning: { name: "Muning", sprite: "cat" },
    "hen-1": { name: "The hen", sprite: "chicken" },
    "hen-2": { name: "The hen", sprite: "chicken" },
  },

  lots: {
    house: {
      name: "home",
      building: "home",
      leaders: "Parents",
      questions: [
        {
          speaker: "tatay",
          prompt: "Who leads the home?",
          choices: [
            wrong("Our neighbors", "tatay", "Ha ha! Our neighbors are kind, but they go home to their own families."),
            right("Our parents"),
            wrong("The youngest child", "nanay", "Your little brother? He can't even reach the stove yet!"),
          ],
          answer: 1,
          praise: say("nanay", "That's right! Tatay and Nanay lead our home, with God's help."),
        },
        {
          speaker: "nanay",
          prompt: "What do our parents do for us?",
          choices: [
            wrong("They do all our homework", "nanay", "My child, if we did your homework, how would you learn?"),
            right("They care for us and guide us"),
            wrong("They let us do anything we want", "tatay", "Anything? Then you'd eat candy for breakfast! Think again."),
          ],
          answer: 1,
          praise: say("tatay", "Yes! We care for you and guide you, because we love you."),
        },
        {
          speaker: "tatay",
          prompt: "How can children help their parents lead the home?",
          choices: [
            right("Obey, help with chores, and pray together"),
            wrong("Hide when it is time to clean", "nanay", "Oh no! I would find you, you know. How can you help instead?"),
            wrong("Argue every time they are asked", "tatay", "Hmm, would that make our home peaceful? Try again."),
          ],
          answer: 0,
          praise: say("tatay", "That's my child! A family that prays together stays together."),
        },
      ],
      script: {
        greet: [
          say("tatay", "There you are! We have the wood ready, but a home needs more than wood."),
          say("nanay", "Let's see if you know how a family works. Ready?"),
        ],
        resume: [say("nanay", "Welcome back, my child! Where were we?")],
        done: [say("tatay", "Neighbors! Grab your tools. Let's build our home!")],
        thanks: [say("nanay", "Our home stands because we help each other. Have you eaten yet?")],
      },
      chatter: {
        waiting: ["Tatay and Nanay are by the house. Talk to them!", "Who will guide our family?"],
        done: ["Our home is complete!", "What a beautiful home!"],
      },
      group: "Family group",
      starter: "As a family member, I",
    },
    school: {
      name: "school",
      building: "school",
      leaders: "The principal and teachers",
      questions: [
        {
          speaker: "principal",
          prompt: "Who leads the school?",
          choices: [
            right("The principal"),
            wrong("The school guard", "principal", "Our guard keeps the gate safe. But who leads the whole school?"),
            wrong("The canteen staff", "teacher", "They keep us fed! But who is in charge of the whole school?"),
          ],
          answer: 0,
          praise: say("teacher", "Correct! The principal leads our school, and teachers lead each class."),
        },
        {
          speaker: "teacher",
          prompt: "What do our teachers and principal do for us?",
          choices: [
            wrong("They play games all day", "principal", "Settle down! Games are fun, but what happens in class?"),
            right("They teach and guide us"),
            wrong("They take our tests for us", "teacher", "If I took your tests, what would you learn?"),
          ],
          answer: 1,
          praise: say("principal", "Very good! We teach and guide you so you grow wise and kind."),
        },
        {
          speaker: "principal",
          prompt: "How can pupils help their teachers?",
          choices: [
            wrong("Talk while the teacher is talking", "teacher", "Hmm, would that help our class learn?"),
            wrong("Skip class when it rains", "principal", "Not even when it rains! What does a good pupil do?"),
            right("Listen, follow the rules, and do their best"),
          ],
          answer: 2,
          praise: say("teacher", "Excellent! Good pupils make a good school."),
        },
      ],
      script: {
        greet: [
          say("principal", "Good morning, class! Settle down, please."),
          say("teacher", "Our books are ready. Now, a short quiz. Don't worry, it's not graded!"),
        ],
        resume: [say("teacher", "Welcome back, class. Let's continue.")],
        done: [say("principal", "Outstanding! Everyone, let's build our school!")],
        thanks: [say("principal", "Keep reading, and no running in the hallway!")],
      },
      chatter: {
        waiting: ["The principal is at the school. Go say hello!", "Who will teach the pupils?"],
        done: ["Our school is open!", "Time to learn!"],
      },
      group: "School group",
      starter: "As a student, I",
    },
    hall: {
      name: "town hall",
      building: "town hall",
      leaders: "The President",
      questions: [
        {
          speaker: "president",
          prompt: "Who leads our country?",
          choices: [
            wrong("The town baker", "president", "Our baker serves the town well. But the whole country?"),
            wrong("The jeepney driver", "president", "He drives us around town! But who leads the nation?"),
            right("The President"),
          ],
          answer: 2,
          praise: say("president", "Correct! The President leads our country."),
        },
        {
          speaker: "president",
          prompt: "What does the President do?",
          choices: [
            right("Serves and leads the people"),
            wrong("Owns every house in the country", "president", "Ha ha! Our houses belong to our families. What is my real job?"),
            wrong("Decides if it will rain or shine", "president", "Not even the President can order the weather!"),
          ],
          answer: 0,
          praise: say("president", "Yes! To lead is to serve the people."),
        },
        {
          speaker: "president",
          prompt: "How can young Filipinos help their country?",
          choices: [
            wrong("Throw trash anywhere", "president", "Would that make our country better? Think again."),
            right("Follow the law, respect others, and love our country"),
            wrong("Do nothing at all", "president", "Even children can help. How?"),
          ],
          answer: 1,
          praise: say("president", "Wonderful! Good citizens make a great nation."),
        },
      ],
      script: {
        greet: [say("president", "Good day, my fellow Filipinos! Answer my questions, and together, let us build our town hall!")],
        resume: [say("president", "Welcome back, citizen. Let us continue.")],
        done: [say("president", "Let the building of our town hall begin! And raise our flag high!")],
        thanks: [say("president", "Serve your country in small ways every day.")],
      },
      chatter: {
        waiting: ["The President is waiting at the town hall.", "Who will lead our town?"],
        done: ["Our flag is flying!", "Long live the Philippines!"],
      },
      group: "Town group",
      starter: "As a citizen, I",
    },
    church: {
      name: "parish",
      building: "church",
      leaders: "The parish priest",
      questions: [
        {
          speaker: "priest",
          prompt: "Who leads the parish?",
          choices: [
            wrong("The choir leader", "priest", "Our choir sings beautifully! But who was sent by the bishop to lead us?"),
            right("The parish priest"),
            wrong("The church caretaker", "priest", "He keeps our church clean. But who leads the parish?"),
          ],
          answer: 1,
          praise: say("priest", "Yes. The parish priest leads the parish, sent by our bishop."),
        },
        {
          speaker: "priest",
          prompt: "What does the parish priest celebrate with us every Sunday?",
          choices: [
            wrong("A basketball game", "priest", "That's fun, but on Sunday we gather for something holy."),
            wrong("A birthday party", "priest", "Not a party, but a holy meal with Jesus. What is it?"),
            right("The Holy Mass"),
          ],
          answer: 2,
          praise: say("priest", "Yes, the Holy Mass, where Jesus gathers us as one family."),
        },
        {
          speaker: "priest",
          prompt: "How can we help our parish priest?",
          choices: [
            right("Pray for him and serve in the parish"),
            wrong("Leave Mass early", "priest", "That would make me a little sad. How can we help instead?"),
            wrong("Stay away from the parish", "priest", "But the parish is your family too! How can you help?"),
          ],
          answer: 0,
          praise: say("priest", "Thank you, my child. Pray for me, as I pray for you."),
        },
      ],
      script: {
        greet: [
          say("priest", "Peace be with you, my child. We even have the wall you built last time."),
          say("priest", "Before we go on, let me ask you about our parish."),
        ],
        resume: [say("priest", "Ah, you are back. Let us continue.")],
        done: [say("priest", "God bless you! Let us build our church!")],
        thanks: [say("priest", "God bless you, my child. Keep our parish in your prayers.")],
      },
      chatter: {
        waiting: ["Father is by the church. Go talk to him!", "These stones are heavy!"],
        done: ["Our parish has a leader!", "Let us pray for our church."],
      },
      group: "Parish group",
      starter: "As a parishioner, I",
    },
  },

  townsfolk: {
    paolo: ["Have you found all the leaders?", "Ate Bea knows where to go!"],
    joy: ["Look for the question marks!", "I love our bayan!"],
    "aling-nena": ["Bread and candies here!", "The leaders wait by their buildings."],
    "mang-ben": ["Taho! Still warm!"],
    "mang-jose": ["Hammer ready!"],
    "aling-rosa": ["Mind the wood, children!"],
    "mang-tonyo": ["These books are for the school."],
    "ate-liza": ["I'll be a teacher one day!"],
    "kuya-dan": ["I carry the flag!"],
    "mang-pedro": ["A town hall needs strong walls."],
    "aling-cora": ["I pray for our parish every day."],
    "lolo-ramon": ["I helped build the old chapel, you know."],
  },

  church: {
    greet: [say("priest", "Welcome back, my child. Let us read what Saint Paul says about God's household.")],
    resume: [say("priest", "Let us look closer at our church.")],
    done: [say("priest", "Our church is complete, built on Christ Jesus. Thank you, my child!")],
  },

  // Draft: a simple wording for Grade 5. Replace it with the translation the class uses.
  verse: {
    reference: "Ephesians 2:19-22",
    text: "You are no longer strangers. You belong to God's household. It is built on the foundation of the apostles and prophets, with Christ Jesus Himself as the capstone. In Him the whole building is held together and grows into a holy temple. In Him you too are being built into a home where God lives by His Spirit.",
  },

  churchQuestions: [
    {
      speaker: "priest",
      prompt: "What is the foundation of God's household?",
      choices: [
        wrong("Gold and silver", "priest", "Riches do not hold up God's house. Who did God build it upon?"),
        right("The apostles and prophets"),
        wrong("The tallest stones", "priest", "Not stones, my child. Listen to the verse again: who are the foundation?"),
      ],
      answer: 1,
      praise: say("priest", "Yes. The apostles and prophets are our foundation."),
    },
    {
      speaker: "priest",
      prompt: "Who are the walls of God's household?",
      choices: [
        wrong("Only the priests", "priest", "Not only priests. Who belongs to God's household?"),
        wrong("Only the strangers", "priest", "The verse says we are no longer strangers. Who are we now?"),
        right("All of us, the members of God's household"),
      ],
      answer: 2,
      praise: say("priest", "Yes. All of us together are the walls of God's household."),
    },
    {
      speaker: "priest",
      prompt: "Who is the capstone?",
      choices: [
        right("Christ Jesus"),
        wrong("The Pope", "priest", "The Pope serves the whole Church, but who holds the whole building together?"),
        wrong("The parish priest", "priest", "Not me, my child! Who holds us all together?"),
      ],
      answer: 0,
      praise: say("priest", "Yes! Christ Jesus is the capstone who holds us all together."),
    },
  ],

  closeUp: {
    title: "Look closer",
    body: "Our church has a foundation, walls, and a capstone. Answer Father's questions to light up each part.",
  },
  churchParts: [
    { title: "Foundation", who: "The apostles and prophets", body: "The foundation is the apostles and prophets." },
    { title: "Walls", who: "Us, the household of God", body: "The walls are us, the members of the household of God." },
    { title: "Capstone", who: "Christ Jesus", body: "The capstone is Christ Jesus. Through Him, the whole structure is held together." },
  ],
  heldTogether: {
    title: "Held together",
    body: "The Church is more than the building we go to. We are being built together into the Church.",
  },

  peter: { title: "Saint Peter", body: "Jesus appointed Peter as the head of the first Christian community." },

  // Role sentences are drafts for the teacher to check against CFC 1409-1410.
  figures: [
    { title: "The Pope", name: "Pope Leo XIV", role: "The successor of Saint Peter, he leads the whole Church.", sprite: "pope" },
    {
      title: "The Papal Nuncio",
      name: "Archbishop Charles John Brown",
      role: "He represents the Pope to the Church and the government of the Philippines.",
      sprite: "nuncio",
    },
    {
      title: "The Archbishop of Tuguegarao",
      name: "Archbishop Ricardo Baccay",
      role: "He leads and cares for all the parishes of the Archdiocese of Tuguegarao.",
      sprite: "archbishop",
    },
    {
      title: "Our parish priest",
      name: "TODO parish priest's name",
      role: "He leads our parish, celebrates the sacraments, and cares for us.",
      sprite: "priest",
    },
    { title: "A deacon", role: "He serves the parish by proclaiming the Gospel, baptizing, and helping the poor.", sprite: "deacon" },
    {
      title: "A lay person",
      role: "Every baptized person shares in the Church's mission at home, in school, and in town.",
      sprite: "lay",
    },
  ],
  figureWait: "Start with the Pope on the left, then come down the line.",

  // Drafts of the Truths to Remember, for the teacher to check.
  plaques: [
    {
      title: "Who chose the leaders of the Church",
      body: "Jesus chose the apostles and made Peter their head. Today the Pope and the bishops, who follow after them, lead the Church in His name.",
    },
    {
      title: "How we share in its mission",
      body: "Priests, deacons, religious, and lay people all serve the Church. By our Baptism, each of us shares in its mission at home, in school, and in our town.",
    },
    {
      title: "For whom we pray",
      body: "We pray for the Pope, our bishop, our parish priest, and everyone who leads us at home, in school, and in our country.",
    },
  ],
  plaqueWait: "Read the plaques in order. Start with the first one, on the left.",

  prayer: {
    title: "Closing prayer",
    body: "Lord Jesus Christ, keep our Church leaders in Your holy heart. Let them grow in love and service to all. Teach them to be Your faithful servants.",
  },
};
