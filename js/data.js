// THE AXIS — Game 1: The Trembling
// Data: maps, tiles, items, and all event scripts (RPG-Maker-style pages/switches).
//
// Maps are painted with ops instead of ASCII art so the level stays editable:
//   ['rect', x, y, w, h, char]  ['h', x1, x2, y, char]  ['v', x, y1, y2, char]
//   ['put', x, y, char]         ['border', char]

/* ===================== tiles ===================== */

export const TILES = {
  'x': { t:'hollowvoid', solid:true },
  '#': { t:'wall',       solid:true },
  '.': { t:'grass',      solid:false },
  ',': { t:'grass2',     solid:false },
  '*': { t:'flowers',    solid:false },
  '-': { t:'path',       solid:false },
  'T': { t:'tree',       solid:true },
  '~': { t:'water',      solid:true },
  'w': { t:'well',       solid:true },
  'h': { t:'shrinestone',solid:false },
  'U': { t:'shrinecrack',solid:true },
  '?': { t:'sign',       solid:true },
  // interiors
  'J': { t:'ifloor',     solid:false },
  'H': { t:'iwall',      solid:true },
  'b': { t:'bed',        solid:true },
  't': { t:'table',      solid:true },
  'n': { t:'counter',    solid:true },
  // ridge / north
  'R': { t:'rock',       solid:true },
  'p': { t:'ridgepath',  solid:false },
  's': { t:'scree',      solid:false },
  'v': { t:'snow',       solid:false },
  'i': { t:'ice',        solid:false },
  'I': { t:'iceblock',   solid:true },
  'C': { t:'cairn',      solid:true },
  'V': { t:'vent',       solid:true },
  // hollow / deep root
  'r': { t:'rootfloor',  solid:false },
  'X': { t:'rootwall',   solid:true },
  'S': { t:'sap',        solid:false },
  'B': { t:'rootbarrier',solid:'mark' },   // solid unless the player carries the Root-Tender's Mark
  'q': { t:'pit',        solid:true },
  'f': { t:'deepfloor',  solid:false },
  'P': { t:'deepwall',   solid:true },
  'L': { t:'platform',   solid:false },
  // east marsh
  'm': { t:'marsh',      solid:false },
  'M': { t:'marshwater', solid:true },
  'e': { t:'reeds',      solid:true },
  'g': { t:'growth',     solid:true },
  'c': { t:'channel',    solid:false },
  // west circle
  'd': { t:'drygrass',   solid:false },
  'a': { t:'ash',        solid:false },
  'O': { t:'circlestone',solid:true },
  'D': { t:'debris',     solid:true },
  'F': { t:'pitfloor',   solid:false },
  // trunk interior
  'k': { t:'trunkfloor', solid:false },
  'K': { t:'trunkwall',  solid:true },
  'y': { t:'livingwood', solid:true }
};

/* ===================== items ===================== */

export const ITEMS = {
  north_token: { name:'North Support Token', kind:'key', desc:'A cold stone token, grained with wind. It carries the north support’s weight.' },
  east_token:  { name:'East Support Token',  kind:'key', desc:'A water-worn token. Something green is pressed into it.' },
  west_token:  { name:'West Support Token',  kind:'key', desc:'A warm ochre token, still holding a little of the circle’s heat.' },
  root_mark:   { name:'Root-Tender’s Mark',  kind:'key', desc:'Not an object so much as an allowance. Living roots let you pass.' },
  fragment_a:  { name:'Memory Fragment — Ledger', kind:'lore', desc:'“Every seventh year we carry a stone up. We do not ask why. The ridge does not ask us why either.”' },
  fragment_b:  { name:'Memory Fragment — Carving', kind:'lore', desc:'Scratched into root: three lines, then a circle with a gap. Someone counted the supports before there were words for them.' },
  fragment_c:  { name:'Memory Fragment — Wind Mark', kind:'lore', desc:'A tally cut by a keeper: one, three, two. The order the vents must breathe.' },
  herbs:       { name:'Dried Herbs',   kind:'use', desc:'Bitter, dry. Chewing them settles the stomach when the ground moves.', stress:-2 },
  water:       { name:'Spring Water',  kind:'use', desc:'Clear and cold, carried up from a seam that still runs honest.', stress:-2 },
  salve:       { name:'Simple Salve',  kind:'use', desc:'Tallow and root oil. It does nothing for the ridge, but your hands stop shaking.', stress:-1 }
};

/* ===================== script helpers ===================== */

const S  = (who, text)        => ({ t:'say', who, text });
const C  = (who, text, options)=> ({ t:'choice', who, text, options });
const SET= (sw, val = true)   => ({ t:'set', sw, val });
const ADD= (n)                => ({ t:'add', n });
const GIVE= (id)              => ({ t:'give', id });
const TAKE= (id)              => ({ t:'take', id });
const PIC= (id)               => ({ t:'pic', id });
const GO = (map, x, y, dir)   => ({ t:'teleport', map, x, y, dir });
const OBJ= (text)             => ({ t:'objective', text });
const TREMOR = (mag = 1)      => ({ t:'tremor', mag });
const TOAST = (text)          => ({ t:'toast', text });
const WAIT = (ms)             => ({ t:'wait', ms });
const IF = (cond, then, els = []) => ({ t:'if', cond, then, else:els });
const HAS = id => ({ item:id });

/* ===================== maps ===================== */

export const MAPS = {

  /* ---------------- home ---------------- */
  home: {
    name: 'Your home', region: 'interior', w: 13, h: 9,
    fill: 'J',
    ops: [
      ['border','H'], ['rect',1,1,11,1,'H'],
      ['rect',1,1,1,7,'H'], ['rect',11,1,1,7,'H'],
      ['put',2,2,'b'], ['put',3,2,'b'],
      ['rect',7,2,3,2,'t'],
      ['put',4,6,'?'], ['put',10,7,'J'], ['put',6,8,'-']
    ],
    onEnter: [
      IF({ sw:'started' }, [], [
        SET('started'),
        S('Vela', 'You’re awake. Good. Did you feel it? Third time tonight — the whole house leaned, like a shoulder against a door.'),
        S('Vela', 'Your grandmother would have said the ridge is turning in its sleep. I say the ridge is a ridge and it should stay still.'),
        S('Vela', 'Go and see Elder Mara before the sun gets high. She’s been down by the shrine since first light, which she never does.'),
        OBJ('Speak with Elder Mara, by the shrine south of the village.')
      ])
    ],
    events: [
      { id:'door_out', x:6, y:8, kind:'transfer', trigger:'touch', to:{ map:'village', x:4, y:7, dir:'down' } },
      { id:'ledger', x:4, y:6, kind:'object', solid:true, pages:[{ actions:[
        S(null, 'A shelf of your grandmother’s things, still dusty. A ledger, a measure of root twine, a stone she carried up every seventh year.'),
        IF({ sw:'ledgerRead' }, [], [
          SET('ledgerRead'), GIVE('fragment_a'),
          S(null, 'The ledger’s last written page: “Every seventh year we carry a stone up. We do not ask why. The ridge does not ask us why either.”'),
          TOAST('Memory Fragment found')
        ])
      ]}]},
      { id:'vela', x:9, y:4, kind:'npc', sprite:'vela', dir:'left', solid:true, pages:[
        { actions:[
          S('Vela', st => st.switches.firstHollow
            ? 'You went down there. You came back up. I don’t know which of those surprises me more.'
            : 'Eat something before you go. The ridge will still be cracked when you get there.')
        ]}
      ]}
    ]
  },

  /* ---------------- village ---------------- */
  village: {
    name: 'Ashhollow', region: 'village', w: 24, h: 18,
    fill: '.',
    ops: [
      ['border','T'],
      /* north road */
      ['put',11,0,'-'], ['put',12,0,'-'], ['v',11,0,8,'-'],
      /* buildings */
      ['rect',2,2,4,3,'H'],  ['put',4,5,'-'],      /* player home */
      ['rect',13,2,4,3,'H'], ['put',14,5,'-'],     /* Mara's house (locked, flavor) */
      ['rect',18,2,4,3,'H'], ['put',20,5,'J'],     /* shuttered shop */
      /* streets */
      ['v',4,5,9,'-'], ['v',14,5,9,'-'], ['v',20,5,9,'-'],
      ['h',1,23,9,'-'],
      ['h',4,20,6,'-'],
      ['v',11,6,13,'-'],
      ['h',6,18,12,'-'],
      ['put',12,12,'w'],
      ['v',11,13,17,'-'], ['put',11,17,'-'], ['put',12,17,'-'],
      ['h',6,18,15,'-'],
      /* greenery */
      ['put',6,3,'T'], ['put',7,3,'T'], ['put',22,3,'T'], ['put',9,4,'T'],
      ['put',8,10,'T'], ['put',9,10,'T'], ['put',15,10,'T'], ['put',16,10,'T'],
      ['put',2,8,'*'], ['put',21,12,'*'], ['put',7,14,'*'], ['put',16,14,'*'],
      ['put',2,12,'?'], ['put',7,17,'?'], ['put',16,17,'?']
    ],
    onEnter: [
      IF({ sw:'villageSeen' }, [], [
        SET('villageSeen'),
        S(null, 'Ashhollow in the morning. The well rope swings though there is no wind.'),
        S(null, 'Two of the shrine stones have shifted in the night — you can see the pale scars where they used to sit.')
      ]),
      IF({ sw:'firstHollow' }, [], [
        IF({ sw:'villageAfterHollow' }, [], [
          SET('villageAfterHollow'),
          TREMOR(1),
          S(null, 'The village is quieter than it was. People are standing in doorways, not talking, watching the ridge.')
        ])
      ])
    ],
    events: [
      { id:'to_home',  x:4, y:5, kind:'transfer', trigger:'touch', to:{ map:'home', x:6, y:7, dir:'up' } },
      { id:'to_north', x:11, y:0, kind:'transfer', trigger:'touch',
        pages:[{ cond:{ sw:'firstHollow' }, to:{ map:'north', x:9, y:12, dir:'up' } },
               { actions:[ S(null, 'The north trail climbs into cold air. You should speak to Elder Mara before you leave the village.') ] }] },
      { id:'to_east',  x:23, y:9, kind:'transfer', trigger:'touch',
        pages:[{ cond:{ sw:'firstHollow' }, to:{ map:'east', x:3, y:9, dir:'right' } },
               { actions:[ S(null, 'The east track drops into marsh. Not yet — see Mara first.') ] }] },
      { id:'to_west',  x:0, y:9, kind:'transfer', trigger:'touch',
        pages:[{ cond:{ sw:'firstHollow' }, to:{ map:'west', x:16, y:8, dir:'left' } },
               { actions:[ S(null, 'The west track runs out across dry ground. Mara first.') ] }] },
      { id:'to_shrine', x:11, y:17, kind:'transfer', trigger:'touch', to:{ map:'shrine', x:7, y:2, dir:'down' } },
      { id:'to_shrine2', x:12, y:17, kind:'transfer', trigger:'touch', to:{ map:'shrine', x:7, y:2, dir:'down' } },

      { id:'shopdoor', x:20, y:5, kind:'object', solid:true, pages:[{ actions:[
        S(null, 'The shop is shuttered. A note, in a careful hand: “Gone up the ridge with the others. Back when it stops.”')
      ]}]},
      { id:'marahouse', x:11, y:5, kind:'object', solid:true, pages:[{ actions:[
        S(null, 'Mara’s door stands open. Inside: a chair, a cold hearth, and forty years of notes she has never once shown you.')
      ]}]},

      { id:'well', x:12, y:12, kind:'object', solid:true, pages:[{ actions:[
        S(null, 'The water has gone cloudy — grey as ash in it. It tastes of stone.'),
        IF({ sw:'firstHollow' }, [
          S(null, 'Under the cloudiness the water is moving, very slightly, away from the ridge.')
        ], [])
      ]}]},

      { id:'v1', x:8, y:12, kind:'npc', sprite:'villager1', dir:'down', solid:true, pages:[
        { actions:[
          S('Hollis', st => st.switches.firstHollow
            ? 'Well water’s still cloudy. Same as the day my father died, that colour. He said it meant the deep ground was breathing out.'
            : 'Well water’s gone cloudy. Don’t drink past the second bucket.')
        ]}
      ]},
      { id:'v2', x:14, y:12, kind:'npc', sprite:'villager2', dir:'down', solid:true, pages:[
        { actions:[
          S('Senn', st => st.switches.firstHollow
            ? 'I drew our house, and then I drew the ground moving under it. Teacher said not to draw that. But it’s what I saw.'
            : 'I felt it three times last night. I counted. Nobody else counted.')
        ]}
      ]},
      { id:'v3', x:18, y:10, kind:'npc', sprite:'villager3', dir:'left', solid:true, pages:[
        { actions:[
          S('Renna', st => st.switches.threeTokens
            ? 'Three tokens. You actually did it. Then go up and finish it, before the ridge decides for us.'
            : st.switches.firstHollow
              ? 'North is cold and the keeper there bites. East is wet. West is burnt. Pick your misery.'
              : 'If you’re going up the ridge, take a second pair of boots. That’s all the wisdom I have.')
        ]}
      ]},

      { id:'sign_n', x:11, y:4, kind:'object', solid:false, pages:[{ actions:[
        S(null, 'A leaning signpost: NORTH — the cold cairn.  EAST — the wet tree.  WEST — the burnt circle.')
      ]}]}
    ]
  },

  /* ---------------- shrine ---------------- */
  shrine: {
    name: 'The Old Root Shrine', region: 'shrine', w: 15, h: 13,
    fill: '.',
    ops: [
      ['border','T'], ['h',2,12,0,'T'],
      ['put',7,0,'-'], ['put',7,1,'-'], ['v',7,1,4,'-'],
      ['rect',3,5,9,5,'h'],
      ['put',3,5,'U'], ['put',11,5,'U'], ['put',3,9,'U'], ['put',11,9,'U'],
      ['put',7,7,'U'],
      ['put',2,4,'R'], ['put',12,4,'R'], ['put',2,10,'R'], ['put',12,10,'R'],
      ['put',4,3,'*'], ['put',10,3,'*'],
      ['put',6,12,'-'], ['put',7,12,'-'], ['put',8,12,'-']
    ],
    onEnter: [
      IF({ sw:'shrineSeen' }, [], [
        SET('shrineSeen'),
        S(null, 'The shrine is nine stones and a root. The stones have always been grey. The root has always been the colour of a held breath.')
      ])
    ],
    events: [
      { id:'to_village', x:7, y:0, kind:'transfer', trigger:'touch', to:{ map:'village', x:11, y:16, dir:'up' } },
      { id:'to_ridge', x:7, y:12, kind:'transfer', trigger:'touch', to:{ map:'ridgepath', x:7, y:2, dir:'down' } },

      { id:'mara', x:6, y:8, kind:'npc', sprite:'mara', dir:'right', solid:true, pages:[
        // page 3: after all three tokens
        { cond:{ sw:'threeTokens' }, actions:[
          S('Elder Mara', 'All three. And not one of the keepers dead over it. You have better manners than your grandmother.'),
          S('Elder Mara', 'The old root is open now — under it, the deep chamber, and above that the trunk itself. I can’t go. My knees are a village matter, not a ridge matter.'),
          S('Elder Mara', st => st.vars.AxisStress >= 50
            ? 'And take this with you: the ground has been counting your steps. It knows how much you’ve let slide. Whatever you decide up there, decide it looking at your own hands.'
            : 'You’ve kept it steady down here. That counts for something up there. Go steady.'),
          OBJ('Go down through the old root — the Deep Root Chamber, then the Trunk.')
        ]},
        // page 2: after first hollow
        { cond:{ sw:'firstHollow' }, actions:[
          S('Elder Mara', 'You’re back, and you brought the smell of open root with you. So it is open. The new hollow is a symptom, not a wound.'),
          S('Elder Mara', 'Three supports held this side of the world steady. North cairn, east tree, west circle. My grandmother walked all three in a day and complained about her boots the whole way.'),
          S('Elder Mara', 'Go to each. Fix what can be fixed. Bring back the tokens — they’re not souvenirs, they’re the only proof the ridge still accepts a hand on it.'),
          OBJ('Visit the three supports. North: cold cairn. East: the wet tree. West: the burnt circle.'),
          C('Elder Mara', 'Before you go — how are you carrying all this?', [
            { label:'Steady enough.', do:[ S('Elder Mara', 'Good. Steady is a resource. Spend it wisely.') ] },
            { label:'My hands won’t stop shaking.', do:[
              ADD(-4),
              S('Elder Mara', 'Then stop looking at the ground and look at the path. The shaking is not the danger. Freezing because of the shaking is.'),
              S('Elder Mara', 'Here. Chew one when it gets bad. Don’t chew three.'),
              GIVE('herbs')
            ]}
          ])
        ]},
        // page 1: first conversation
        { actions:[
          S('Elder Mara', 'That’s close enough. Look at the crack — see how it runs? It didn’t crack. It was already a seam.'),
          S('Elder Mara', 'The ridge has always spoken. Lately it only groans. Your grandmother used to leave offerings at the old root. If the hollow is open, go carefully. Bring me whatever the earth gives you.'),
          C('Elder Mara', 'Well?', [
            { label:'I’ll go and look.', do:[
              S('Elder Mara', 'Down the south path, then up the ridge track until the ground gives out. You’ll know it.'),
              OBJ('Go south past the shrine, up the ridge track, and find the new hollow.'),
              SET('questHollow')
            ]},
            { label:'What am I looking for?', do:[
              S('Elder Mara', 'I don’t know. That’s why I’m sending you and not going myself. If I knew, I’d send a rule instead of a person.'),
              C('Elder Mara', 'Anything else?', [
                { label:'I’ll go.', do:[ OBJ('Go south past the shrine, up the ridge track, and find the new hollow.'), SET('questHollow') ] },
                { label:'Why me?', do:[
                  S('Elder Mara', 'Because you still leave the offering at the old root even when nobody’s watching. That’s the whole qualification. Now go.'),
                  OBJ('Go south past the shrine, up the ridge track, and find the new hollow.'),
                  SET('questHollow')
                ]}
              ])
            ]},
            { label:'Why me?', do:[
              S('Elder Mara', 'Because you still leave the offering at the old root even when nobody’s watching. That’s the whole qualification.'),
              OBJ('Go south past the shrine, up the ridge track, and find the new hollow.'),
              SET('questHollow')
            ]}
          ])
        ]}
      ]},

      { id:'oldroot', x:7, y:7, kind:'object', solid:true, pages:[
        { cond:{ sw:'threeTokens' }, actions:[
          S(null, 'The old root has opened along a seam you never noticed, down into warm dark. The Root-Tender’s Mark warms at your wrist.'),
          C(null, 'Descend?', [
            { label:'Descend.', do:[ GO('deeproot', 5, 11, 'up'), OBJ('Find the trunk.') ] },
            { label:'Not yet.', do:[] }
          ])
        ]},
        { cond:{ sw:'firstHollow' }, actions:[
          S(null, 'The old root is still shut along the seam. Not yet. The ridge hasn’t asked to be opened.'),
          S(null, 'When all three tokens are set into the shrine, this seam will remember how to open.')
        ]},
        { actions:[
          S(null, 'The old root — a hold of grey wood too big for a tree, worn smooth by offerings and hands. A hairline seam runs down it.'),
          S(null, 'Your grandmother left a stone in the notch, every seventh year. There is no stone this year.')
        ]}
      ]},

      { id:'stones', x:7, y:5, kind:'object', solid:false, pages:[{ actions:[
        S(null, 'Nine stones in a ring, and one in the middle that has never been touched by weather on its top face.'),
        S(null, 'Somebody has scratched a tally into the ring stone: three marks, then a line drawn out and away.')
      ]}]}
    ]
  },

  /* ---------------- ridge path ---------------- */
  ridgepath: {
    name: 'The Ridge Track', region: 'ridge', w: 17, h: 13,
    fill: '.',
    ops: [
      ['border','R'],
      ['rect',6,9,6,3,'q'],
      ['v',7,1,8,'p'], ['h',7,11,8,'p'],
      ['put',8,2,'R'], ['put',5,4,'R'], ['put',12,4,'R'], ['put',4,7,'R'], ['put',13,7,'R']
    ],
    events: [
      { id:'to_shrine', x:7, y:0, kind:'transfer', trigger:'touch', to:{ map:'shrine', x:7, y:11, dir:'up' } },
      { id:'hollowmouth', x:9, y:9, kind:'object', solid:true, pages:[
        { cond:{ sw:'hollowEntered' }, actions:[
          C(null, 'The hollow. Climb back down?', [
            { label:'Climb down.', do:[ GO('hollow1', 6, 6, 'down') ] },
            { label:'Back to the surface.', do:[] }
          ])
        ]},
        { actions:[
          PIC('hollowentrance'),
          S(null, 'The ground has given out in a clean oval, as if something underneath took a slow step and the surface followed.'),
          S(null, 'Roots at the rim are braided, not broken. This is not a collapse. It is a mouth.'),
          C(null, 'The air coming up is warm and smells of split wood.', [
            { label:'Climb down.', do:[
              SET('questHollow'),
              TREMOR(1),
              GO('hollow1', 6, 6, 'down'),
              OBJ('Look into the hollow. Find something to bring back to Mara.')
            ]},
            { label:'Not yet — I need to prepare.', do:[ S(null, 'You step back. The hollow waits without impatience, which is worse.') ] }
          ])
        ]}
      ]},
      { id:'lean_tree', x:5, y:5, kind:'object', solid:false, pages:[{ actions:[        S(null, 'A tree leaning badly, its foot-panels of root lifted clear of the soil on one side.'),
        S(null, 'Down here the ground gives. Up on the crown the leaves are perfectly still.')
      ]}]}
    ]
  },

  /* ---------------- first hollow ---------------- */
  hollow1: {
    name: 'The First Hollow — Descent', region: 'hollow', w: 14, h: 11,
    fill: 'r',
    ops: [
      ['border','X'],
      ['h',2,11,1,'X'], ['h',2,11,9,'X'],
      ['put',6,1,'r'], ['put',7,1,'r'], ['put',6,9,'r'], ['put',7,9,'r'],
      ['v',6,1,10,'r'],
      ['put',9,4,'S'], ['put',3,5,'S'],
      ['h',2,10,5,'r'], ['v',10,5,8,'r'],
      ['put',6,10,'r'], ['put',7,10,'r']
    ],
    events: [
      { id:'up', x:6, y:0, kind:'transfer', trigger:'touch', to:{ map:'ridgepath', x:9, y:8, dir:'down' } },
      { id:'down', x:6, y:10, kind:'transfer', trigger:'touch', to:{ map:'hollow2', x:6, y:1, dir:'down' },
        pages:[{ actions:[ GO('hollow2', 6, 1, 'down') ] }] },
      { id:'sap1', x:9, y:4, kind:'object', solid:false, pages:[{ actions:[
        S(null, 'Glowing sap, thick as honey, welling where a root has been scored open. It is warm.'),
        ADD(2), TOAST('Axis stress rises'),
        S(null, 'The cut is not a break. It is a bite.')
      ]}]},
      { id:'sap2', x:3, y:5, kind:'object', solid:false, pages:[{ actions:[
        S(null, 'The sap here has run thin and pale. Not enough pressure behind it.'),
        ADD(1)
      ]}]}
    ]
  },

  hollow2: {
    name: 'The First Hollow — The Branch', region: 'hollow', w: 16, h: 12,
    fill: 'r',
    ops: [
      ['border','X'],
      ['v',6,1,4,'r'], ['h',3,13,4,'r'], ['v',12,4,8,'r'],
      ['h',4,12,8,'r'], ['v',4,8,10,'r'], ['put',4,10,'r'],
      ['put',8,6,'S'], ['put',10,2,'X'], ['put',3,6,'X'], ['put',13,2,'X'],
      ['v',8,8,10,'r']
    ],
    events: [
      { id:'back', x:6, y:0, kind:'transfer', trigger:'touch', to:{ map:'hollow1', x:6, y:7, dir:'up' } },
      { id:'deeper', x:4, y:11, kind:'transfer', trigger:'touch', to:{ map:'hollow3', x:7, y:1, dir:'down' } },
      { id:'carving', x:10, y:6, kind:'object', solid:true, pages:[{ actions:[
        S(null, 'A flat panel of root, hardened, with marks cut into it by something patient.'),
        S(null, 'Three lines. Then a circle with a gap in it, the gap facing out.'),
        IF({ sw:'carveRead' }, [], [
          SET('carveRead'), GIVE('fragment_b'), TOAST('Memory Fragment found'),
          S(null, 'Someone counted the supports a very long time ago, before there were words for counting them.')
        ])
      ]}]},
      { id:'sapB', x:8, y:6, kind:'object', solid:false, pages:[{ actions:[
        S(null, 'A standing bead of sap, four fingers tall, that has never fallen. It leans slightly toward the ridge.')
      ]}]}
    ]
  },

  hollow3: {
    name: 'The First Hollow — The Caretaker', region: 'hollow', w: 13, h: 11,
    fill: 'r',
    ops: [
      ['border','X'],
      ['v',7,1,8,'r'], ['h',2,10,4,'r'], ['h',2,10,7,'r'],
      ['put',7,5,'S'], ['put',2,5,'X'], ['put',10,5,'X'], ['put',4,2,'X'], ['put',9,2,'X']
    ],
    events: [
      { id:'back', x:7, y:0, kind:'transfer', trigger:'touch', to:{ map:'hollow2', x:4, y:10, dir:'up' } },
      { id:'onward', x:7, y:10, kind:'transfer', trigger:'touch', to:{ map:'hollow4', x:6, y:1, dir:'down' } },
      { id:'remnant', x:7, y:3, kind:'object', solid:true, pages:[
        { cond:{ sw:'caretakerMet' }, actions:[
          S('Root-Tender', 'You came back. Good. Most people hear the truth once and treat it as weather.'),
          S('Root-Tender', st => st.vars.AxisStress >= 50
            ? 'You are carrying a lot of it now. I can hear it in your step. Be careful what you ask me for — I am not in the habit of refusing.'
            : 'The mark will let the roots part for you. Use it to reach what needs reaching, not to go where you were not asked.')
        ]},
        { actions:[
          PIC('caretaker'),
          SET('caretakerMet'),
          S('Root-Tender', 'Stop. You are standing where a support used to be.'),
          S('Root-Tender', 'Stress is rising. The supports are failing. Three remain within reach. Stabilize them or open a clean path. Do not wait for the full collapse.'),
          C('Root-Tender', 'Which will you do?', [
            { label:'Stabilize them. I’ll go to all three.', do:[
              SET('promiseStabilize'),
              S('Root-Tender', 'Then go. North is cold and honest. East is wet and patient. West is burnt and ashamed. They will each ask for something small.'),
              S('Root-Tender', 'Take this. It is not a gift. It is an allowance — living roots will know it and let you through.')
            ]},
            { label:'What happens if the supports fail?', do:[
              S('Root-Tender', 'The ground remembers a different shape. It will find that shape again with or without you.'),
              S('Root-Tender', 'You are standing in the part it will find first.'),
              C('Root-Tender', 'Well?', [
                { label:'I’ll stabilize them.', do:[
                  SET('promiseStabilize'),
                  S('Root-Tender', 'Then go. North, east, west. Ask the keepers; they are tired but they are not stupid.')
                ]},
                { label:'And the clean path?', do:[
                  SET('promiseOpen'), ADD(10),
                  S('Root-Tender', 'You would have to be worth opening for. Ask me again at the trunk, with your hands steady and your reasons honest.'),
                  TOAST('Axis stress rises')
                ]}
              ])
            ]},
            { label:'Open a clean path. How?', do:[
              SET('promiseOpen'), ADD(10),
              S('Root-Tender', 'You do not open it. It opens toward whoever is worth passing through it.'),
              S('Root-Tender', 'Ask me again at the trunk. Bring steady hands and honest reasons, and no tokens at all.'),
              TOAST('Axis stress rises')
            ]}
          ]),
          S('Root-Tender', 'Take the allowance. The name of it is the Root-Tender’s Mark, and it will not make you safe. It will make you expected.'),
          GIVE('root_mark')
        ]}
      ]}
    ]
  },

  hollow4: {
    name: 'The First Hollow — The Trunk Section', region: 'hollow', w: 13, h: 10,
    fill: 'r',
    ops: [
      ['border','X'],
      ['v',6,1,6,'r'],
      ['put',6,4,'S'], ['put',3,3,'X'], ['put',9,3,'X']
    ],
    events: [
      { id:'back', x:6, y:0, kind:'transfer', trigger:'touch', to:{ map:'hollow3', x:7, y:9, dir:'up' } },
      { id:'trunksection', x:6, y:4, kind:'object', solid:true, pages:[{ actions:[
        PIC('trunk'),
        S(null, 'An upright section of trunk, stripped clean, standing in the root like a held breath.'),
        S(null, 'The bark on the growth side has gone thin enough to read light through. On the other side something has been gnawing — not an animal. The marks are the size of a hand, and patient, and evenly spaced.'),
        ADD(5), TOAST('Axis stress rises'),
        S(null, 'The rings are the wrong shape. Not smaller. Wrong — as if the trunk has started counting in a different direction.'),
        IF({ sw:'sawTrunk' }, [], [ SET('sawTrunk') ])
      ]}]},
      { id:'wayout', x:6, y:9, kind:'transfer', trigger:'touch', pages:[{ actions:[
        SET('firstHollow'), SET('hollowEntered'),
        GO('ridgepath', 9, 10, 'down'),
        OBJ('Bring what you learned back to Elder Mara.')
      ]}]}
    ]
  },

  /* ---------------- north ---------------- */
  north: {
    name: 'The North Ridge', region: 'north', w: 20, h: 15,
    fill: 'v',
    ops: [
      ['border','R'],
      ['rect',1,1,18,1,'R'],
      ['rect',12,3,5,4,'R'], ['rect',2,4,4,3,'R'],
      ['v',9,2,12,'p'], ['h',5,14,11,'p'],
      ['put',9,4,'C'],
      ['put',12,8,'I'], ['put',13,8,'I'], ['put',14,9,'I'],
      ['put',4,9,'R'], ['put',15,12,'R']
    ],
    onEnter: [
      IF({ sw:'northSeen' }, [], [
        SET('northSeen'),
        S(null, 'Up here the wind takes the words out of your mouth before you finish them. The cairn stands at the crest, cracked along its length.')
      ])
    ],
    events: [
      { id:'to_village', x:9, y:14, kind:'transfer', trigger:'touch', to:{ map:'village', x:11, y:1, dir:'down' } },
      { id:'ventdoor', x:10, y:4, kind:'object', solid:true, pages:[
          { cond:{ sw:'ventOpen' }, to:{ map:'northvent', x:6, y:8, dir:'up' } },
          { actions:[
            S(null, 'The cairn has a vent at its foot — a hand-wide shaft where warm air used to rise out and keep the support dry.'),
            S(null, 'Ice has closed it. The keeper will know how it wants clearing.')
          ]}
        ]},

      { id:'keeperN', x:7, y:8, kind:'npc', sprite:'keeperN', dir:'right', solid:true, pages:[
        { cond:{ sw:'northToken' }, actions:[
          S('North Keeper', 'Vent breathes. Cairn’s holding. Take the token and stop standing in the wind grinning at me.'),
          S('North Keeper', 'Two more supports. Go on.')
        ]},
        { cond:{ sw:'ventOpen' }, actions:[
          S('North Keeper', 'Wind’s moving through the vent again. I can hear the change in it — the ridge is talking to itself instead of shouting.'),
          S('North Keeper', 'That’s the north support held. Not fixed; held. There’s a difference and you should learn it.'),
          GIVE('north_token'), SET('northToken'),
          S('North Keeper', 'Here. The token. It’s cold. Keep it cold — don’t put it in your pocket with the wet ones.'),
          OBJ(st => st.switches.eastToken || st.switches.westToken ? 'One support left.' : 'Two supports left: east marsh, and the burnt circle west.')
        ]},
        { actions:[
          S('North Keeper', 'You came up. Most don’t, in this wind. Most stand at the bottom and decide the ridge isn’t worth the boots.'),
          S('North Keeper', 'North support’s the cairn. It’s cracked because the vent at its foot is iced shut — warm air can’t get out, and cold gets in and sits.'),
          C('North Keeper', 'You look like you want to help. Do you?', [
            { label:'Tell me how to clear the vent.', do:[
              S('North Keeper', 'Three ice plugs, from the shaft mouth down. They don’t want brute force — they want the order. Get it wrong and they fuse back, and you’ll feel the ridge complain about it.'),
              S('North Keeper', 'The marks are cut into the shaft wall: one. Then three. Then two. That’s the order the wind reads them in.'),
              OBJ('Clear the three ice plugs in the vent, in the order the marks give: one, three, two.'),
              SET('ventQuest')
            ]},
            { label:'Not really. Tell me what’s wrong.', do:[
              S('North Keeper', 'Vent’s iced. Three plugs. Order matters — one, three, two, says the wall.'),
              OBJ('Clear the three ice plugs in the vent, in the order the marks give: one, three, two.'),
              SET('ventQuest')
            ]},
            { label:'No. I have somewhere else to be.', do:[
              ADD(6), TOAST('Axis stress rises'),
              S('North Keeper', 'Then walk away with your back to it. I’ll note that the ridge asked and was told no.'),
              S(null, 'You feel the ground settle a fraction — the way a hinge settles when a door is left open.')
            ]}
          ])
        ]}
      ]},

      { id:'cairn', x:9, y:4, kind:'object', solid:true, pages:[
        { cond:{ sw:'northToken' }, actions:[ S(null, 'The cairn stands straight. The crack in it is still there, but it is no longer travelling.') ]},
        { actions:[
          S(null, 'The cairn is stacked stone, waist high, split from cap to base along one face.'),
          S(null, 'Cold air is pouring down into the crack. Cold air going down means warm air has nowhere to go — the vent is closed.'),
          IF({ sw:'ventQuest' }, [], [ SET('ventQuest') ])
        ]}
      ]},
      { id:'markN', x:12, y:9, kind:'object', solid:false, pages:[{ actions:[
        S(null, 'A keeper’s tally cut into a flat stone: one, three, two. Repeated down the column, so it can’t be a mistake.'),
        IF({ sw:'windRead' }, [], [
          SET('windRead'), GIVE('fragment_c'), TOAST('Memory Fragment found')
        ])
      ]}]}
    ]
  },

  northvent: {
    name: 'The Vent Shaft', region: 'north', w: 13, h: 10,
    fill: 'i',
    ops: [
      ['border','R'],
      ['rect',2,2,9,5,'i'],
      ['put',5,4,'I'], ['put',6,4,'I'], ['put',7,4,'I'],
      ['put',3,3,'R'], ['put',9,3,'R'], ['put',3,6,'R'], ['put',9,6,'R']
    ],
    onEnter: [
      IF({ sw:'ventEntered' }, [], [
        SET('ventEntered'),
        S(null, 'The shaft goes down into blue dark. Three plugs of ice sit in the wall channel, one above the next, and each is scored with a mark: I, III, II.')
      ])
    ],
    events: [
      { id:'out', x:6, y:9, kind:'transfer', trigger:'touch', to:{ map:'north', x:9, y:4, dir:'up' } },
      { id:'plug1', x:5, y:4, kind:'object', solid:true, pages:[
        { cond:{ sw:'plug1' }, actions:[ S(null, 'The first channel is open. Air moves.') ]},
        { actions:[
          S(null, 'The first plug — the one the wall marks with a single stroke. You strike it and it falls apart into wet shards. Air moves behind it, thin and cold.'),
          SET('plug1'), TOAST('Vent I cleared')
        ]}
      ]},
      { id:'plug3', x:7, y:4, kind:'object', solid:true, pages:[
        { cond:{ sw:'plug3' }, actions:[ S(null, 'The third channel is open. The air has a voice now.') ]},
        { actions:[
          IF({ sw:'plug1' }, [
            S(null, 'The third plug shatters along its grain. Cold air rushes down and the shaft hums.'),
            SET('plug3'), TOAST('Vent III cleared')
          ], [
            S(null, 'You reach for the third plug first. Nothing gives. The ice is only a symptom of being early.'),
            ADD(3), TOAST('Out of order')
          ])
        ]}
      ]},
      { id:'plug2', x:6, y:4, kind:'object', solid:true, pages:[
        { cond:{ sw:'plug2' }, actions:[ S(null, 'The middle channel is open.') ]},
        { actions:[
          IF({ sw:'plug3' }, [
            S(null, 'The last plug goes easily, and all at once the shaft pulls air past you — up and out, a long relieved breath.'),
            SET('plug2'), SET('ventOpen'), TOAST('The vent breathes'),
            S(null, 'Somewhere above, you hear the cairn make a small settling noise.'),
            OBJ('Return to the North Keeper.')
          ], [
            S(null, 'You reach for the middle plug. Behind you, the ice tightens with a sound like something remembering.'),
            ADD(5), TOAST('Wrong order — the plugs fuse back'),
            SET('plug1', false), SET('plug3', false),
            S(null, '“One, then three, then two,” the wall says. You did not do that. The channels have closed over.')
          ])
        ]}
      ]}
    ]
  },

  /* ---------------- east ---------------- */
  east: {
    name: 'The East Marsh', region: 'east', w: 20, h: 15,
    fill: 'm',
    ops: [
      ['border','e'],
      ['v',2,1,13,'e'],
      ['h',6,17,4,'m'], ['v',16,4,11,'m'],
      ['rect',1,5,10,4,'M'],
      ['rect',9,8,4,3,'M'], ['put',10,8,'c'],
      ['put',10,9,'m'], ['put',10,10,'m'], ['put',10,11,'m'], ['put',11,11,'m'],
      ['put',11,8,'T'],
      ['put',8,6,'e'], ['put',13,6,'e'], ['put',4,10,'e'],
      ['put',15,7,'g'], ['put',16,7,'g']
    ],
    onEnter: [
      IF({ sw:'eastSeen' }, [], [
        SET('eastSeen'),
        S(null, 'The marsh stands still where it should be running. The water is warm and has a skin on it.'),
        S(null, 'Far out, the support tree stands half-submerged, and there is a great deal of green around its foot that should not be there.')
      ])
    ],
    events: [
      { id:'to_village', x:19, y:7, kind:'transfer', trigger:'touch', to:{ map:'village', x:22, y:9, dir:'left' } },
      { id:'keeperE', x:17, y:6, kind:'npc', sprite:'keeperE', dir:'left', solid:true, pages:[
        { cond:{ sw:'eastToken' }, actions:[
          S('East Keeper', 'Water’s moving. Listen to it. It’s arguing with the reeds instead of sulking.'),
          S('East Keeper', 'Take the token. And wipe it — it’s wet. The north one doesn’t mind, the west one does.')
        ]},
        { cond:{ sw:'eastFlow' }, actions:[
          S('East Keeper', 'You shifted the stone. Water’s running again and the growth has already lost heart. Look at it — grey at the edges.'),
          S('East Keeper', 'The tree is standing in moving water now. That’s the support held.'),
          GIVE('east_token'), SET('eastToken'),
          IF({ sw:'cutGrowth' }, [], []),
          OBJ(st => st.switches.northToken ? 'One support left: the burnt circle, west.' : 'Two supports left: north cairn, west circle.')
        ]},
        { actions:[
          S('East Keeper', 'Mind the skin on the water. It’ll take the colour out of your boots and the feeling out of your feet if you stand too long.'),
          S('East Keeper', 'Support’s that tree, half under. Water’s supposed to run past its foot, not sit on it. It stopped running when that stone slid into the channel mouth.'),
          C('East Keeper', 'Can you shift a stone?', [
            { label:'Show me which one.', do:[
              S('East Keeper', 'The channel mouth, north-west of here. The stone’s sitting in it like a cork. Push it out of the channel and into the open water and the flow comes back by itself.'),
              S('East Keeper', 'You’ll have to walk round it — you can’t pull, only push. That’s not a riddle, that’s just stones.'),
              OBJ('Push the stone out of the channel mouth in the east marsh.'),
              SET('eastQuest')
            ]},
            { label:'No. This is not my marsh.', do:[
              ADD(6), TOAST('Axis stress rises'),
              S('East Keeper', 'Then the water keeps standing and the green keeps eating. I’ll still be here. I’m the only thing that doesn’t move.')
            ]}
          ])
        ]}
      ]},
      { id:'pushstone', x:10, y:10, kind:'push', solid:true, tile:'pushstone', pages:[
        { cond:{ sw:'eastFlow' }, actions:[ S(null, 'The stone sits in open water now, half-sunk, harmless.') ]},
        { actions:[
          S(null, 'A flat river stone, wedged tight into the channel mouth. It would move if it were pushed from the side.')
        ]}
      ]},
      { id:'tree', x:11, y:8, kind:'object', solid:true, pages:[
        { cond:{ sw:'eastFlow' }, actions:[
          S(null, 'The support tree stands in running water. The green at its foot has gone grey and is coming apart in the current.'),
          S(null, 'Its bark is intact where the water moves. Below the old waterline it has the same patient hand-sized gnawing as the trunk in the hollow.'),
          SET('cutGrowth')
        ]},
        { actions:[
          S(null, 'The support tree, half under. Standing water has gone warm around its foot and something has grown there that is not reed and not root.'),
          S(null, 'It is soft to look at and you do not want to touch it.')
        ]}
      ]}
    ]
  },

  /* ---------------- west ---------------- */
  west: {
    name: 'The West Stone Circle', region: 'west', w: 18, h: 14,
    fill: 'd',
    ops: [
      ['border','R'],
      ['rect',4,3,10,8,'a'],
      ['put',8,6,'O'], ['put',9,6,'O'],
      ['put',7,5,'D'], ['put',10,5,'D'], ['put',9,8,'D'],
      ['put',5,4,'O'], ['put',12,4,'O'], ['put',5,8,'O'], ['put',12,8,'O'],
      ['rect',8,10,2,2,'F'], ['put',8,10,'F'], ['put',9,10,'F'],
      ['v',9,11,12,'F']
    ],
    onEnter: [
      IF({ sw:'westSeen' }, [], [
        SET('westSeen'),
        S(null, 'The circle is on burnt ground. The grass stops in a ring thirty paces wide, and inside the ring nothing has tried to grow back.'),
        S(null, 'The east stones are toppled and scorched. The centre stone is still standing, and it is facing the wrong way.')
      ])
    ],
    events: [
      { id:'to_village', x:17, y:8, kind:'transfer', trigger:'touch', to:{ map:'village', x:1, y:9, dir:'right' } },
      { id:'keeperW', x:14, y:7, kind:'npc', sprite:'keeperW', dir:'left', solid:true, pages:[
        { cond:{ sw:'westToken' }, actions:[
          S('West Keeper', 'Centre’s facing the ridge. Debris cleared. Circle’s still burnt and I’m still the last one here, but it holds.'),
          S('West Keeper', 'Take the token. It’s warm. That’s not sentiment, that’s the circle giving you something back.')
        ]},
        { cond:{ sw:'westWarm' }, actions:[
          S('West Keeper', 'It’s warm. Feel it — the centre stone’s warm on the ridge face.'),
          S('West Keeper', 'That’s the west support held, and the first honest thing this ground has done in eleven years.'),
          GIVE('west_token'), SET('westToken'),
          OBJ(st => (st.switches.northToken && st.switches.eastToken) ? 'All three supports are held. Return to Elder Mara.' : 'Two supports still out there.')
        ]},
        { actions:[
          S('West Keeper', 'You’re the fourth person this year. The other three came, looked at the burnt ground, and said something kind and left.'),
          S('West Keeper', 'We don’t need kind. We need the circle set right. The east stones are down — fire took them — and the centre’s been turned so it faces away from the ridge.'),
          S('West Keeper', 'A support faces what it holds. Ours faces a burnt field. You see the problem.'),
          C('West Keeper', 'Three lots of debris, one stone that wants turning. Well?', [
            { label:'I’ll clear it and turn the stone.', do:[
              S('West Keeper', 'Then the carving will tell you which way. “The warm face greets the ridge.” It’s cut into the ring stone — everyone reads it, nobody does it.'),
              OBJ('Clear the three debris piles in the burnt circle, then turn the centre stone to face the ridge.'),
              SET('westQuest')
            ]},
            { label:'What happens if I turn it wrong?', do:[
              S('West Keeper', 'Nothing. That’s the cruelty of it. Nothing happens, and a hundred years go by, and it’s still facing the wrong way.'),
              OBJ('Clear the three debris piles in the burnt circle, then turn the centre stone to face the ridge.'),
              SET('westQuest')
            ]},
            { label:'Not my burnt field.', do:[
              ADD(6), TOAST('Axis stress rises'),
              S('West Keeper', 'No. It’s mine. I’ll be here when you’ve thought about it.')
            ]}
          ])
        ]}
      ]},
      { id:'deb1', x:7, y:5, kind:'object', solid:true, pages:[
        { cond:{ sw:'deb1' }, actions:[ S(null, 'Cleared.') ]},
        { actions:[ S(null, 'A heap of fallen stone and charred timber. You move it, stone by stone, to the edge of the ring.'), SET('deb1'), TOAST('Debris cleared — 1 of 3') ]}
      ]},
      { id:'deb2', x:10, y:5, kind:'object', solid:true, pages:[
        { cond:{ sw:'deb2' }, actions:[ S(null, 'Cleared.') ]},
        { actions:[ S(null, 'A collapsed lintel-stone, too heavy to lift, so you roll it. It leaves a clean pale scar in the ash.'), SET('deb2'), TOAST('Debris cleared — 2 of 3') ]}
      ]},
      { id:'deb3', x:9, y:8, kind:'object', solid:true, pages:[
        { cond:{ sw:'deb3' }, actions:[ S(null, 'Cleared.') ]},
        { actions:[ S(null, 'Charred root and a scatter of flat stones. The ground under it is warm, faintly, like a hand just taken away.'), SET('deb3'), TOAST('Debris cleared — 3 of 3') ]}
      ]},
      { id:'centrestone', x:8, y:6, kind:'object', solid:true, pages:[
        { cond:{ sw:'westWarm' }, actions:[ S(null, 'The centre stone faces the ridge. It is warm on that face and no other.') ]},
        { actions:[
          IF({ sw:'deb1' }, [
            IF({ sw:'deb2' }, [
              IF({ sw:'deb3' }, [
                S(null, 'With the debris gone the stone turns easily — far too easily for its size. It comes round in quarters.'),
                C(null, 'Turn the centre stone.', [
                  { label:'Face it north — toward the ridge.', do:[
                    S(null, 'You set it north. The stone holds. Warmth comes up through your palms, and the burnt ring around it makes a sound like a held breath let go.'),
                    TREMOR(0),
                    SET('westWarm'), TOAST('The west circle holds'),
                    OBJ('Return to the West Keeper.')
                  ]},
                  { label:'Face it east — toward the old sun road.', do:[
                    S(null, 'Nothing stops you. Nothing happens either. The stone sits facing east, warm on no face at all.'),
                    S(null, '“The warm face greets the ridge,” says the carving. You turn it north.')
                  ]},
                  { label:'Face it south — toward the village.', do:[
                    S(null, 'You set it south. The stone is cold on every face, which answers the question well enough.'),
                    C(null, 'Try again?', [
                      { label:'Face it north.', do:[
                        S(null, 'North holds. Warmth climbs your arms. The ring goes quiet in the right way.'),
                        SET('westWarm'), TOAST('The west circle holds')
                      ]},
                      { label:'Leave it.', do:[ S(null, 'You leave it facing the village. The keeper says nothing, which is worse than a complaint.') ]}
                    ])
                  ]}
                ]),
                S(null, 'Between the stones, the ring is level again. The ash has stopped drifting.')
              ], [ S(null, 'One heap of debris is still in the way — the stone won’t turn cleanly with it there.') ])
            ], [ S(null, 'Debris is still crowding the stone. Clear the ring first.') ])
          ], [ S(null, 'The stone is jammed against fallen debris. Clear the ring first.') ])
        ]}
      ]},
      { id:'carvingW', x:5, y:4, kind:'object', solid:true, pages:[{ actions:[
        S(null, 'Cut into the ring stone, in letters worn round at the edges: “THE WARM FACE GREETS THE RIDGE.”'),
        S(null, 'Below it, in a different and much worse hand: “or it faces nothing and we all pretend not to notice.”')
      ]}]},
      { id:'pit', x:8, y:10, kind:'object', solid:false, pages:[{ actions:[
        S(null, 'A pit where the ground has eroded under the circle’s north edge. Warm air comes up out of it.'),
        S(null, 'You can see the underside of the ring stones. They are not set in soil. They are set in root.')
      ]}]}
    ]
  },

  /* ---------------- deep root ---------------- */
  deeproot: {
    name: 'The Deep Root Chamber', region: 'deeproot', w: 16, h: 13,
    fill: 'f',
    ops: [
      ['border','P'],
      ['v',7,1,11,'f'],
      ['h',2,13,6,'f'], ['h',2,13,9,'f'],
      ['v',2,6,9,'f'], ['v',13,6,9,'f'],
      ['put',7,2,'S'], ['put',10,4,'S'], ['put',4,7,'S'],
      ['put',5,3,'P'], ['put',9,3,'P'], ['put',3,5,'P'], ['put',11,5,'P'],
      ['put',5,8,'L'], ['put',9,8,'L']
    ],
    onEnter: [
      IF({ sw:'deepSeen' }, [], [
        SET('deepSeen'),
        TREMOR(2),
        S(null, 'Down here the root is not a network any more. It is one thing, and it is all around you, and it is warm.'),
        S(null, 'The floor moves in a slow wave — not a tremor. A breath.'),
        IF({ varGte:['AxisStress', 50] }, [
          S(null, 'The sap running down the walls has gone thin and cloudy. Somewhere above, something is still chewing.')
        ], [
          S(null, 'The sap runs thick and clear in the seams. Whatever is chewing has not got this far yet.')
        ])
      ])
    ],
    events: [
      { id:'up', x:7, y:0, kind:'transfer', trigger:'touch', to:{ map:'shrine', x:7, y:8, dir:'down' } },
      { id:'totrunk', x:7, y:12, kind:'transfer', trigger:'touch', to:{ map:'trunk', x:6, y:9, dir:'up' } },
      { id:'barrier', x:7, y:6, kind:'object', solid:false, pages:[{ actions:[
        S(null, 'A curtain of living root, thin as sinew, that parts around the Root-Tender’s Mark and closes behind you.')
      ]}]},
      { id:'sapdeep', x:10, y:4, kind:'object', solid:false, pages:[{ actions:[
        S(null, 'The sap here runs amber and warm. You could put your hand in it. You do not.'),
        ADD(2)
      ]}]}
    ]
  },

  /* ---------------- trunk ---------------- */
  trunk: {
    name: 'The Trunk', region: 'trunk', w: 13, h: 11,
    fill: 'k',
    ops: [
      ['border','K'],
      ['rect',1,1,11,1,'y'],
      ['put',5,4,'y'], ['put',7,4,'y'],
      ['put',3,6,'S'], ['put',9,6,'S'],
      ['put',2,8,'K'], ['put',10,8,'K']
    ],
    onEnter: [
      IF({ sw:'trunkSeen' }, [], [
        SET('trunkSeen'),
        TREMOR(1),
        S(null, 'Inside the trunk the walls are wood and the light is coming from the wood. There is a sound in here like a room full of people being very quiet.'),
        S(null, 'The Axis. Not a thing you can point at — a place where everything is holding still and it is costing something.')
      ])
    ],
    events: [
      { id:'down', x:6, y:10, kind:'transfer', trigger:'touch', to:{ map:'deeproot', x:7, y:11, dir:'up' } },
      { id:'axisheart', x:6, y:5, kind:'object', solid:true, pages:[
        { cond:{ sw:'finalChoice' }, actions:[ S(null, 'It is done. The trunk is quiet.') ]},
        { actions:[
          S(null, 'The living wood has opened a place the size of a doorway, and the place is not empty. It is holding something still.'),
          S(null, 'This is where the supports run to. Three roads, all of them ending here, all of them carrying the same small weight.'),
          C('Root-Tender', 'You came. Show me your hands.', [
            { label:'Use the three tokens. Stabilize it.', do:[
              IF({ item:'north_token' }, [
                IF({ item:'east_token' }, [
                  IF({ item:'west_token' }, [
                    TAKE('north_token'), TAKE('east_token'), TAKE('west_token'),
                    S('Root-Tender', 'North. East. West. Set them down where each road ends and say nothing clever while you do it.'),
                    S(null, 'Three tokens. A short rite — a stone in each notch, a hand flat on the wood, one held breath.'),
                    SET('finalChoice'), SET('FinalChoiceStabilize'),
                    TREMOR(2),
                    S(null, 'The trembling eases. Not all at once — the way a held muscle eases, in stages, and complains.'),
                    PIC('ending_stabilize'),
                    S(null, 'The supports take the weight back. Above you, in the world, ridges settle along their length and trees that were leaning find they no longer have to.'),
                    S(null, 'You walk out into an ordinary evening. The well water is clear by morning. Nobody in Ashhollow will ever know what it cost, and that is the shape of the thing you chose.'),
                    S(null, 'Far out past the ridge, in ground nobody farms, a seam stays open a finger’s width. Waiting to be asked again.'),
                    { t:'ending', which:'stabilize' }
                  ], [ S('Root-Tender', 'West is not here. The circle is still facing the wrong way.') ])
                ], [ S('Root-Tender', 'East is not here. The water is still standing.') ])
              ], [ S('Root-Tender', 'North is not here. The cairn is still cracked.') ])
            ]},
            { label:'Open a clean path.', do:[
              IF({ sw:'promiseOpen' }, [
                S('Root-Tender', 'You said you would. You said it in the hollow with the marks on the wall in front of you, and you have not once pretended you didn’t.'),
                S(null, 'You put your hand flat on the living wood and do not take it away when it gets warm.'),
                SET('finalChoice'), SET('FinalChoiceOpen'),
                TREMOR(2),
                S(null, 'The trunk opens along the seam — not a tear. A door.'),
                PIC('ending_open'),
                S(null, 'Something small comes through and goes past you, unhurried, without looking up. It has been a long time since anything was allowed through.'),
                S(null, 'Behind it the hollow stays open, controlled, a finger’s width that you could put a hand into. The tremors stop because the pressure has somewhere to go now.'),
                S(null, 'In the spring, in the burnt circle and out past the marsh, things come up that nobody planted and nobody recognises. The keepers argue about it for years, fondly.'),
                S(null, 'The ridge is still a ridge. It just holds its weight differently.'),
                { t:'ending', which:'open' }
              ], [
                IF({ varGte:['AxisStress', 50] }, [
                  S('Root-Tender', 'You did not ask for this in the hollow. But you carried it here — you can hear it in the way you stand.'),
                  S('Root-Tender', 'I said you would have to be worth opening for. I did not say you would have to be careful.'),
                  SET('finalChoice'), SET('FinalChoiceOpen'),
                  TREMOR(2),
                  PIC('ending_open'),
                  S(null, 'The trunk opens along the seam. Something small goes past you, unhurried, and does not look up.'),
                  S(null, 'The tremors stop, because the pressure has somewhere to go. In spring, things come up out of the burnt ground that nobody planted.'),
                  S(null, 'You did not choose this as carefully as you could have. It works anyway. That will bother you for the rest of your life.'),
                  { t:'ending', which:'open' }
                ], [
                  S('Root-Tender', 'Not with those hands. Not yet.'),
                  S('Root-Tender', 'The path opens toward whoever is worth passing through it. Go and be worth it, or go and stabilize what is left. Both are honest. Standing here is not.')
                ])
              ])
            ]},
            { label:'Not yet. I’m not ready.', do:[
              S('Root-Tender', 'Then go back down. The ridge will wait, badly.'),
              SET('lastRefusal')
            ]}
          ])
        ]}
      ]},
      { id:'notch', x:3, y:6, kind:'object', solid:false, pages:[{ actions:[
        S(null, 'A notch worn in the living wood, exactly the size of a support token.')
      ]}]}
    ]
  }
};

export const START = { map: 'home', x: 6, y: 6, dir: 'down' };
export const PLAYER_NAME_DEFAULT = 'Wren';
