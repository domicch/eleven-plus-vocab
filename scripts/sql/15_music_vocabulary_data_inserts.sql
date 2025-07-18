-- Step 15: Insert comprehensive music vocabulary data into music_vocabulary table
-- This includes essential music theory terms and definitions

INSERT INTO music_vocabulary (word, definition) VALUES 
-- Tempo and Expression Terms
('Allegro', 'A fast tempo marking in music, typically between 120-168 beats per minute.'),
('Andante', 'A moderately slow tempo marking in music, literally meaning "walking pace".'),
('Adagio', 'A slow tempo marking, slower than andante but faster than largo.'),
('Largo', 'A very slow tempo marking, the slowest commonly used tempo.'),
('Moderato', 'A moderate tempo marking, literally meaning "moderate".'),
('Vivace', 'A lively and fast tempo marking, faster than allegro.'),
('Presto', 'A very fast tempo marking, faster than allegro.'),
('Ritardando', 'A gradual slowing down of tempo.'),
('Accelerando', 'A gradual speeding up of tempo.'),
('Rubato', 'A flexible approach to tempo where timing is slightly stretched or compressed for expression.'),

-- Dynamics
('Forte', 'A dynamic marking indicating music should be played loudly.'),
('Piano', 'A dynamic marking indicating music should be played softly.'),
('Fortissimo', 'A dynamic marking indicating music should be played very loudly.'),
('Pianissimo', 'A dynamic marking indicating music should be played very softly.'),
('Mezzo-forte', 'A dynamic marking indicating music should be played moderately loud.'),
('Mezzo-piano', 'A dynamic marking indicating music should be played moderately soft.'),
('Crescendo', 'A gradual increase in volume or intensity of sound.'),
('Diminuendo', 'A gradual decrease in volume or intensity of sound.'),
('Sforzando', 'A sudden, strong accent on a note or chord.'),

-- Musical Structure and Form
('Phrase', 'A musical sentence, typically 4-8 measures long, that expresses a complete thought.'),
('Cadence', 'A harmonic progression that provides closure or resolution at the end of a musical phrase.'),
('Sequence', 'A musical pattern that is repeated at different pitch levels.'),
('Modulation', 'The process of changing from one key to another within a piece of music.'),
('Binary Form', 'A musical form consisting of two contrasting sections, typically AABA.'),
('Ternary Form', 'A musical form consisting of three sections, typically ABA.'),
('Rondo Form', 'A musical form featuring a recurring theme alternating with contrasting episodes.'),
('Theme and Variations', 'A musical form where a theme is presented and then altered through various techniques.'),
('Sonata Form', 'A musical form typically used in first movements, consisting of exposition, development, and recapitulation.'),

-- Harmony and Chords
('Harmony', 'The combination of simultaneously sounded musical notes to produce chords.'),
('Chord', 'Three or more notes sounded simultaneously.'),
('Triad', 'A three-note chord consisting of a root, third, and fifth.'),
('Seventh Chord', 'A four-note chord consisting of a triad plus a seventh above the root.'),
('Major Chord', 'A triad with a major third and perfect fifth above the root.'),
('Minor Chord', 'A triad with a minor third and perfect fifth above the root.'),
('Diminished Chord', 'A triad with a minor third and diminished fifth above the root.'),
('Augmented Chord', 'A triad with a major third and augmented fifth above the root.'),
('Inversion', 'Rearranging the notes of a chord so that a note other than the root is in the bass.'),
('Voice Leading', 'The smooth movement of individual voices or parts in harmonic progressions.'),

-- Scales and Intervals
('Scale', 'A series of musical notes arranged in ascending or descending order.'),
('Major Scale', 'A seven-note scale with a specific pattern of whole and half steps.'),
('Minor Scale', 'A seven-note scale with a different pattern of whole and half steps than major.'),
('Chromatic Scale', 'A scale containing all twelve semitones within an octave.'),
('Pentatonic Scale', 'A five-note scale commonly used in various musical traditions.'),
('Interval', 'The distance between two pitches, measured in semitones or scale degrees.'),
('Octave', 'The interval between two notes where one has twice the frequency of the other.'),
('Perfect Fifth', 'An interval of seven semitones, considered highly consonant.'),
('Perfect Fourth', 'An interval of five semitones.'),
('Major Third', 'An interval of four semitones.'),
('Minor Third', 'An interval of three semitones.'),
('Semitone', 'The smallest interval commonly used in Western music, also called a half step.'),
('Tone', 'An interval of two semitones, also called a whole step.'),

-- Rhythm and Meter
('Beat', 'The basic unit of time in music, the pulse that you tap your foot to.'),
('Rhythm', 'The pattern of durations in music, how long or short notes are.'),
('Meter', 'The organization of beats into recurring patterns of strong and weak beats.'),
('Time Signature', 'A notation indicating the meter, showing beats per measure and note value of each beat.'),
('Syncopation', 'A rhythmic technique where emphasis is placed on weak beats or off-beats.'),
('Polyrhythm', 'The simultaneous use of two or more different rhythms.'),
('Hemiola', 'A rhythmic pattern where two bars in triple time sound like three bars in duple time.'),
('Anacrusis', 'An upbeat or pickup note that precedes the first strong beat of a phrase.'),

-- Melody and Motifs
('Melody', 'A sequence of musical notes that form the main tune of a piece.'),
('Motif', 'A short musical idea that is developed and repeated throughout a piece.'),
('Leitmotif', 'A recurring musical theme associated with a particular character, place, or idea.'),
('Conjunct Motion', 'Melodic movement by step, using adjacent notes in the scale.'),
('Disjunct Motion', 'Melodic movement by leap, skipping over notes in the scale.'),
('Contour', 'The overall shape of a melody, its pattern of ups and downs.'),

-- Texture and Voicing
('Texture', 'The way multiple musical lines or voices are combined in a piece.'),
('Monophony', 'A texture consisting of a single melodic line without accompaniment.'),
('Homophony', 'A texture with a main melody accompanied by chords.'),
('Polyphony', 'A texture with multiple independent melodic lines occurring simultaneously.'),
('Counterpoint', 'The art of combining two or more melodic lines in a polyphonic texture.'),
('Canon', 'A contrapuntal technique where a melody is imitated by one or more voices.'),
('Fugue', 'A complex polyphonic composition based on a subject that appears in multiple voices.'),

-- Articulation and Expression
('Staccato', 'A style of playing notes in a short, detached manner.'),
('Legato', 'A style of playing notes in a smooth, connected manner.'),
('Tenuto', 'A style of playing notes with their full value, slightly emphasized.'),
('Accent', 'Emphasis placed on a particular note or beat.'),
('Glissando', 'A continuous slide between two pitches.'),
('Vibrato', 'A slight, rapid variation in pitch used for expressive effect.'),
('Tremolo', 'A rapid repetition of a single note or rapid alternation between two notes.'),
('Trill', 'A rapid alternation between a note and the note above it.'),

-- Musical Instruments and Voices
('Timbre', 'The unique quality or color of a musical sound that distinguishes it from others.'),
('Register', 'A particular range of pitches within a voice or instrument.'),
('Tessitura', 'The range within which a voice or instrument sounds best.'),
('Soprano', 'The highest female voice type.'),
('Alto', 'The lowest female voice type.'),
('Tenor', 'The highest male voice type.'),
('Bass', 'The lowest male voice type.'),
('Transposition', 'The process of changing the pitch level of a piece of music.'),

-- Advanced Harmonic Concepts
('Tonic', 'The first note of a scale, the home note or key center.'),
('Dominant', 'The fifth note of a scale, which has a strong pull toward the tonic.'),
('Subdominant', 'The fourth note of a scale.'),
('Leading Tone', 'The seventh note of a major scale, which has a strong tendency to resolve to the tonic.'),
('Supertonic', 'The second note of a scale.'),
('Mediant', 'The third note of a scale.'),
('Submediant', 'The sixth note of a scale.'),
('Enharmonic', 'Two notes that sound the same but are spelled differently.'),
('Augmented Sixth', 'A type of chord that creates tension and typically resolves to the dominant.'),
('Neapolitan Sixth', 'A type of chord built on the flattened second degree of the scale.')
ON CONFLICT (word) DO NOTHING;

-- Verify the data was inserted
SELECT COUNT(*) as total_music_words FROM music_vocabulary;
SELECT word, LEFT(definition, 50) || '...' as definition_preview 
FROM music_vocabulary 
ORDER BY word 
LIMIT 10;