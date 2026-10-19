/* ==========================================================================
   WATER HARDNESS DATA (indicative)
   `mgl` = hardness as mg/l calcium carbonate (CaCO3)
   `sodium` = sodium already in the supply, mg/l
   Keyed by postcode AREA (the letters at the start, e.g. "SW", "KT").
   PLACEHOLDER DATA: replace with figures from the relevant water suppliers
   (Thames, Affinity, SES, South East, Essex & Suffolk) before launch.
   `districts` lets you override a specific outcode, e.g. "TN13".
   ========================================================================== */
window.HWS = window.HWS || {};

HWS.hardnessData = {
  areas: {
    // Central / Greater London
    E:  { name: 'East London',        mgl: 285, sodium: 30 },
    EC: { name: 'City of London',     mgl: 275, sodium: 25 },
    N:  { name: 'North London',       mgl: 280, sodium: 25 },
    NW: { name: 'North West London',  mgl: 275, sodium: 25 },
    SE: { name: 'South East London',  mgl: 295, sodium: 30 },
    SW: { name: 'South West London',  mgl: 285, sodium: 25 },
    W:  { name: 'West London',        mgl: 280, sodium: 25 },
    WC: { name: 'West Central London',mgl: 275, sodium: 25 },

    // Outer London (inside the M25)
    BR: { name: 'Bromley',            mgl: 300, sodium: 20 },
    CR: { name: 'Croydon',            mgl: 300, sodium: 20 },
    DA: { name: 'Dartford & Bexley',  mgl: 310, sodium: 25 },
    EN: { name: 'Enfield',            mgl: 290, sodium: 25 },
    HA: { name: 'Harrow',             mgl: 295, sodium: 20 },
    IG: { name: 'Ilford',             mgl: 290, sodium: 40 },
    KT: { name: 'Kingston',           mgl: 280, sodium: 25 },
    RM: { name: 'Romford',            mgl: 300, sodium: 45 },
    SM: { name: 'Sutton',             mgl: 290, sodium: 20 },
    TW: { name: 'Twickenham & Hounslow', mgl: 275, sodium: 25 },
    UB: { name: 'Uxbridge',           mgl: 300, sodium: 20 },
    WD: { name: 'Watford',            mgl: 305, sodium: 20 },

    // Home Counties
    AL: { name: 'St Albans',          mgl: 305, sodium: 15 },
    SG: { name: 'Stevenage',          mgl: 310, sodium: 15 },
    LU: { name: 'Luton',              mgl: 300, sodium: 15 },
    HP: { name: 'Hemel Hempstead',    mgl: 295, sodium: 15 },
    SL: { name: 'Slough',             mgl: 285, sodium: 20 },
    RG: { name: 'Reading',            mgl: 270, sodium: 20 },
    GU: { name: 'Guildford',          mgl: 255, sodium: 15 },
    RH: { name: 'Redhill & Reigate',  mgl: 265, sodium: 15 },
    TN: { name: 'Tunbridge Wells & Sevenoaks', mgl: 220, sodium: 20 },
    ME: { name: 'Medway',             mgl: 300, sodium: 25 },
    CM: { name: 'Chelmsford',         mgl: 300, sodium: 50 },
    SS: { name: 'Southend',           mgl: 290, sodium: 55 },
  },

  districts: {
    // Example override: 'TN13': { name: 'Sevenoaks', mgl: 260, sodium: 20 },
  },

  // Hardness bands (upper bound inclusive, mg/l CaCO3). Colours come from tokens.css.
  bands: [
    { max: 50,       label: 'Soft',            color: '--hard-soft',     text: 'Great news. Your water is naturally soft, so limescale is unlikely to be an issue.' },
    { max: 100,      label: 'Moderately soft', color: '--hard-mod-soft', text: 'Your water is fairly soft. A filter may still improve taste.' },
    { max: 150,      label: 'Slightly hard',   color: '--hard-slight',   text: 'You may notice light limescale on taps and in your kettle over time.' },
    { max: 200,      label: 'Moderately hard', color: '--hard-moderate', text: 'Limescale will build up on taps, showers and appliances. A softener will help.' },
    { max: 300,      label: 'Hard',            color: '--hard-hard',     text: 'Hard water. Expect regular limescale, soap scum and scale building up in your boiler. A softener will make a real difference.' },
    { max: Infinity, label: 'Very hard',       color: '--hard-very',     text: 'Very hard water. Among the hardest in the UK. A water softener will make a big difference to your home.' },
  ],

  dialMax: 400,

  // Sodium maths: ion-exchange softening adds ~1 mg/l sodium per 2.175 mg/l
  // hardness (as CaCO3) removed, i.e. about 46 mg/l per 100 mg/l.
  sodium: {
    perHardness: 1 / 2.175,
    limit: 200,             // UK drinking water limit, mg/l
    closeThreshold: 150,    // above this we flag "close to the limit"
  },
};
