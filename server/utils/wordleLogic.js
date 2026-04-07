// Wordle Game Logic — CommonJS
// State: { word, guesses:[], maxGuesses:6, result:null }
// Each guess produces feedback: [{letter, status:'correct'|'present'|'absent'}]

const WORDLE_WORDS = [
  'about','above','abuse','actor','adapt','admit','adopt','adult','after','again',
  'agent','agree','ahead','alarm','album','alien','align','alike','alive','allow',
  'alone','along','alter','among','anger','angle','angry','anime','ankle','annoy',
  'apart','apple','apply','arena','argue','arise','armor','array','arrow','aside',
  'asset','atlas','avoid','awake','award','aware','baker','basic','basin','basis',
  'batch','beach','beard','beast','begin','being','bench','berry','birth','black',
  'blade','blame','blank','blast','blaze','bleed','blend','bless','blind','block',
  'blood','bloom','blown','blues','blunt','board','bonus','booth','bound','brain',
  'brand','brave','bread','break','breed','brick','bride','brief','bring','broad',
  'broke','brook','brush','buddy','build','bunch','burst','buyer','cabin','candy',
  'cargo','carry','catch','cause','chain','chair','charm','chase','cheap','check',
  'cheek','cheer','chest','chief','child','china','choir','chunk','civil','claim',
  'clash','class','clean','clear','clerk','click','cliff','climb','cling','clock',
  'clone','close','cloud','coach','coast','color','comet','comic','coral','count',
  'court','cover','crack','craft','crane','crash','crazy','cream','creek','crews',
  'crime','crisp','cross','crowd','crown','crude','crush','curve','cycle','dance',
  'dealt','death','debut','decay','demon','dense','depth','derby','devil','diary',
  'dirty','donor','doubt','dough','draft','drain','drama','drank','drawn','dream',
  'dress','dried','drift','drill','drink','drive','drone','drops','drove','drums',
  'drunk','dryer','dusty','eager','eagle','early','earth','eight','elect','elite',
  'email','empty','enemy','enjoy','enter','entry','equal','error','essay','ethic',
  'event','every','exact','exams','exile','exist','extra','fable','facet','faith',
  'false','fancy','fatal','fault','feast','fence','fever','fiber','field','fifth',
  'fifty','fight','final','finds','first','fixed','flame','flash','fleet','flesh',
  'float','flood','floor','flour','fluid','flush','focal','force','forge','forth',
  'forum','found','frame','frank','fraud','fresh','front','frost','fruit','fully',
  'fungi','genre','ghost','giant','given','glass','globe','glory','glove','going',
  'grace','grade','grain','grand','grant','graph','grasp','grass','grave','great',
  'green','greet','grief','grind','groan','groom','gross','group','grove','grown',
  'guard','guess','guest','guide','guild','guilt','guise','guild','phase','phone',
  'photo','piano','piece','pilot','pinch','pitch','pixel','pizza','place','plain',
  'plane','plant','plate','plaza','plead','plumb','plume','plunk','point','polar',
  'pound','power','press','price','pride','prime','print','prior','prize','probe',
  'prone','proof','prose','proud','prove','pupil','queen','query','quest','queue',
  'quick','quiet','quota','quote','radar','radio','raise','rally','ranch','range',
  'rapid','ratio','reach','react','ready','realm','rebel','refer','reign','relax',
  'remit','renew','repay','reply','rider','ridge','rifle','right','rigid','risky',
  'rival','river','robin','robot','rocky','roots','rough','round','route','royal',
  'rugby','rural','salad','sauce','scale','scene','scope','score','scout','screw',
  'sense','serve','seven','shade','shaft','shake','shall','shame','shape','share',
  'shark','sharp','sheep','sheer','sheet','shelf','shell','shift','shine','shirt',
  'shock','shore','short','shout','shown','sided','siege','sight','silly','since',
  'sixth','sixty','sized','skill','skull','slash','slave','sleep','slice','slide',
  'slope','smart','smell','smile','smoke','snack','snake','solar','solid','solve',
  'sorry','sound','south','space','spare','spark','speak','speed','spend','spice',
  'spine','spite','split','spoke','spoon','sport','spray','squad','stack','staff',
  'stage','stain','stake','stale','stall','stamp','stand','stare','start','state',
  'stays','steak','steam','steel','steep','steer','steps','stern','stick','stiff',
  'still','stock','stoke','stone','stood','store','storm','story','stove','strip',
  'stuck','study','stuff','stump','style','sugar','suite','super','surge','swamp',
  'swear','sweep','sweet','swept','swift','swing','sword','swore','swung','table',
  'taste','teach','teeth','theme','thick','thing','think','third','thorn','those',
  'three','threw','throw','thumb','tiger','tight','timer','tired','title','today',
  'token','total','touch','tough','tower','toxic','trace','track','trade','trail',
  'train','trait','trash','treat','trend','trial','tribe','trick','tried','troop',
  'truck','truly','trump','trunk','trust','truth','tumor','twice','twist','typed',
  'ultra','uncle','under','union','unite','unity','until','upper','upset','urban',
  'usage','usual','utter','valid','value','vault','venue','verse','video','vigor',
  'viral','virus','visit','vital','vivid','vocal','vodka','voice','voter','wages',
  'waste','watch','water','weary','weave','wedge','weigh','weird','whale','wheat',
  'wheel','where','which','while','whine','white','whole','whose','woman','world',
  'worry','worse','worst','worth','wound','wrath','wreck','write','wrong','wrote',
  'yacht','yield','young','yours','youth','zebra',
];

/**
 * Create the initial Wordle game state.
 * @param {string} [word] — optional word to use; if omitted, picks random from WORDLE_WORDS
 * @returns {object} initial state
 */
const getInitialWordleState = (word) => {
  const chosen = word || WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
  return {
    word: chosen.toLowerCase(),
    guesses: [],
    maxGuesses: 6,
    result: null,
  };
};

/**
 * Submit a guess against the current Wordle state.
 * Handles duplicate letters correctly using a two-pass approach:
 *   Pass 1: mark all exact matches as 'correct'
 *   Pass 2: for remaining letters, mark 'present' only if unmatched occurrences remain
 *
 * @param {object} state — current game state
 * @param {string} guess — the 5-letter guess (case-insensitive)
 * @returns {object} { valid, reason?, feedback?, newState? }
 */
const submitGuess = (state, guess) => {
  if (!guess || typeof guess !== 'string') {
    return { valid: false, reason: 'Invalid guess' };
  }

  const normalizedGuess = guess.toLowerCase().trim();

  if (normalizedGuess.length !== 5) {
    return { valid: false, reason: 'Guess must be 5 letters' };
  }

  if (!/^[a-z]{5}$/.test(normalizedGuess)) {
    return { valid: false, reason: 'Guess must contain only letters' };
  }

  if (state.result) {
    return { valid: false, reason: 'Game is already over' };
  }

  if (state.guesses.length >= state.maxGuesses) {
    return { valid: false, reason: 'No guesses remaining' };
  }

  // Check if word is in the word list
  if (!WORDLE_WORDS.includes(normalizedGuess)) {
    return { valid: false, reason: 'Not in word list' };
  }

  const word = state.word;
  const guessLetters = normalizedGuess.split('');
  const wordLetters = word.split('');
  const feedback = Array(5).fill(null);

  // Track remaining letter counts from the target word (for handling duplicates)
  const remaining = {};
  for (const ch of wordLetters) {
    remaining[ch] = (remaining[ch] || 0) + 1;
  }

  // Pass 1: Mark exact matches ('correct')
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === wordLetters[i]) {
      feedback[i] = { letter: guessLetters[i], status: 'correct' };
      remaining[guessLetters[i]]--;
    }
  }

  // Pass 2: Mark 'present' or 'absent' for non-exact positions
  for (let i = 0; i < 5; i++) {
    if (feedback[i]) continue; // already marked as correct
    const ch = guessLetters[i];
    if (remaining[ch] && remaining[ch] > 0) {
      feedback[i] = { letter: ch, status: 'present' };
      remaining[ch]--;
    } else {
      feedback[i] = { letter: ch, status: 'absent' };
    }
  }

  const newGuesses = [...state.guesses, { guess: normalizedGuess, feedback }];
  const isWin = normalizedGuess === word;
  const isLoss = !isWin && newGuesses.length >= state.maxGuesses;

  const newState = {
    ...state,
    guesses: newGuesses,
    result: isWin ? 'win' : isLoss ? 'loss' : null,
  };

  return {
    valid: true,
    feedback,
    newState,
  };
};

module.exports = {
  WORDLE_WORDS,
  getInitialWordleState,
  submitGuess,
};
