import { JsPsych } from "jspsych";
import jsPsychHtmlKeyboardResponse from '@jspsych/plugin-html-keyboard-response';
import jsPsychHtmlButtonResponse from '@jspsych/plugin-html-button-response';

/* Constants */
const DEFAULT_PRACTICE_TRIALS = 5;
const DEFAULT_TEST_TRIALS = 5;
const DEFAULT_MIXED_TRIALS = 30;

/* Types */
interface Stimulus {
    img: string;
    name: string;
    shape: string;
    color: string;
}

interface Trial {
    target: Stimulus;
    left: Stimulus;
    right: Stimulus;
    correct: number;
    dimension?: string;
}

interface TrialData {
    response: number;
    correct: boolean;
    rt: number;
    phase: string;
    dimension: string;
    target: string;
}

interface GameState {
    audio_enabled: boolean;
    current_phase: string;
    trials_completed: number;
}

/* Stimuli definitions */
const STIMULI = {
    brownRabbit: { 
        img: 'assets/brown_rabbit.svg', 
        name: 'brown rabbit', 
        shape: 'rabbit', 
        color: 'brown' 
    },
    whiteRabbit: { 
        img: 'assets/white_rabbit.svg', 
        name: 'white rabbit', 
        shape: 'rabbit', 
        color: 'white' 
    },
    brownBoat: { 
        img: 'assets/brown_boat.svg', 
        name: 'brown boat', 
        shape: 'boat', 
        color: 'brown' 
    },
    whiteBoat: { 
        img: 'assets/white_boat.svg', 
        name: 'white boat', 
        shape: 'boat', 
        color: 'white' 
    },
    blueBall: { 
        img: 'assets/blue_ball.svg', 
        name: 'blue ball', 
        shape: 'ball', 
        color: 'blue' 
    },
    orangeTruck: { 
        img: 'assets/orange_truck.svg', 
        name: 'orange truck', 
        shape: 'truck', 
        color: 'orange' 
    },
    blueTruck: { 
        img: 'assets/blue_truck.svg', 
        name: 'blue truck', 
        shape: 'truck', 
        color: 'blue' 
    },
    orangeBall: { 
        img: 'assets/orange_ball.svg', 
        name: 'orange ball', 
        shape: 'ball', 
        color: 'orange' 
    }
};

/* Internal state */
let state: GameState = {
    audio_enabled: false,
    current_phase: '',
    trials_completed: 0
};

/* Internal functions */
function resetState() {
    state = {
        audio_enabled: false,
        current_phase: '',
        trials_completed: 0
    };
}

function playAudio(text: string) {
    if (state.audio_enabled && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
    }
}

function createTrialStimulus(target: Stimulus, left: Stimulus, right: Stimulus, cueWord: string) {
    return `
        <div class="dccs-trial-container">
            <div class="dccs-cue">${cueWord}</div>
            <div class="dccs-target-container">
                <div class="dccs-target-card">
                    <img src="${target.img}" alt="${target.name}">
                </div>
            </div>
            <div class="dccs-choices-container">
                <div class="dccs-choice-card" data-choice="0">
                    <img src="${left.img}" alt="${left.name}">
                </div>
                <div class="dccs-choice-card" data-choice="1">
                    <img src="${right.img}" alt="${right.name}">
                </div>
            </div>
            <div class="dccs-feedback" id="feedback"></div>
        </div>
    `;
}

function setupTrial(
    jsPsych: JsPsych,
    trial: Trial,
    phase: string,
    trialNum: number,
    dimension: string,
    withFeedback: boolean = false
) {
    playAudio(dimension.toUpperCase());
    const cards = document.querySelectorAll('.dccs-choice-card');
    const startTime = performance.now();
    let responded = false;
    
    cards.forEach((card, cardIndex) => {
        card.addEventListener('click', function() {
            if (responded) return;
            responded = true;
            
            const correct = cardIndex === trial.correct;
            
            if (withFeedback) {
                const feedbackDiv = document.getElementById('feedback');
                if (feedbackDiv) {
                    if (correct) {
                        feedbackDiv.textContent = "That's right!";
                        feedbackDiv.className = 'dccs-feedback correct';
                        playAudio("That's right!");
                    } else {
                        feedbackDiv.textContent = "This is the same color.";
                        feedbackDiv.className = 'dccs-feedback incorrect';
                        playAudio("This is the same color, so you should choose this picture.");
                        cards[trial.correct].classList.add('highlight');
                    }
                }
                
                setTimeout(() => {
                    jsPsych.finishTrial({
                        response: cardIndex,
                        correct: correct,
                        rt: performance.now() - startTime
                    });
                }, correct ? 1500 : 2500);
            } else {
                jsPsych.finishTrial({
                    response: cardIndex,
                    correct: correct,
                    rt: performance.now() - startTime
                });
            }
        });
    });
    
    // Prompt after 5 seconds for test trials
    if (!withFeedback) {
        setTimeout(() => {
            if (!responded && jsPsych.getCurrentTrial()) {
                playAudio("Choose one of the pictures.");
            }
        }, 5000);
    }
}

function generateMixedTrials(numTrials: number): Trial[] {
    const mixedTrials: Trial[] = [];
    const testStimuli = [STIMULI.blueBall, STIMULI.orangeTruck, STIMULI.blueTruck, STIMULI.orangeBall];
    
    for (let i = 0; i < numTrials; i++) {
        const dimension = i % 2 === 0 ? 'color' : 'shape';
        const target = testStimuli[Math.floor(Math.random() * testStimuli.length)];
        const choices = [STIMULI.blueBall, STIMULI.orangeTruck];
        
        if (Math.random() > 0.5) {
            choices.reverse();
        }
        
        let correct: number;
        if (dimension === 'color') {
            correct = choices[0].color === target.color ? 0 : 1;
        } else {
            correct = choices[0].shape === target.shape ? 0 : 1;
        }
        
        mixedTrials.push({
            target: target,
            left: choices[0],
            right: choices[1],
            correct: correct,
            dimension: dimension
        });
    }
    
    return mixedTrials;
}

/* Timeline component generating functions */
function createWelcome() {
    const welcome = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div style="max-width: 600px; margin: auto;">
                <h1>Dimensional Change Card Sort</h1>
                <p style="font-size: 18px; line-height: 1.5;">
                    Welcome! In this game, you'll match pictures based on their COLOR or SHAPE.
                </p>
                <p style="font-size: 18px; line-height: 1.5;">
                    We'll show you a picture at the top, and you'll choose which picture below matches it.
                </p>
                <div class="audio-toggle">
                    <label>
                        <input type="checkbox" id="audioToggle" onchange="window.tempaudio_enabled = this.checked">
                        Enable audio instructions
                    </label>
                </div>
            </div>
        `,
        choices: ['Start'],
        data: { trial_type: 'welcome' },
        on_finish: function(data: any) {
            state.audio_enabled = (window as any).tempaudio_enabled || false;
            data.audio_enabled = state.audio_enabled;
            delete (window as any).tempaudio_enabled;
        }
    };
    
    return welcome;
}

function createColorInstructions() {
    const instructions = [
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div style="max-width: 600px; margin: auto;">
                    <h2>COLOR Game</h2>
                    <p style="font-size: 18px;">
                        We are going to play some games. In the COLOR game, choose the picture 
                        that's the same COLOR as the picture at the top of the screen.
                    </p>
                    <div class="instructions-card">
                        <p>If it's <strong>BROWN</strong>, choose this picture:</p>
                        <img src="${STIMULI.brownBoat.img}" alt="brown boat">
                    </div>
                </div>
            `,
            choices: ['Next'],
            on_load: function() {
                playAudio("We are going to play some games. In the COLOR game, choose the picture that's the same COLOR as the picture at the top of the screen. If it's BROWN, choose this picture.");
            }
        },
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div style="max-width: 600px; margin: auto;">
                    <div class="instructions-card">
                        <p>If it's <strong>WHITE</strong>, choose this picture:</p>
                        <img src="${STIMULI.whiteRabbit.img}" alt="white rabbit">
                    </div>
                </div>
            `,
            choices: ['Next'],
            on_load: function() {
                playAudio("If it's WHITE, choose this picture.");
            }
        },
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: '<h2>Now you try!</h2><p>Click the button when you\'re ready to practice.</p>',
            choices: ['Start Practice'],
            on_load: function() {
                playAudio("Now you try.");
            }
        }
    ];
    
    return instructions;
}

function createPracticeTrial(
    jsPsych: JsPsych,
    trial: Trial,
    index: number
) {
    const practiceTrial = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: createTrialStimulus(trial.target, trial.left, trial.right, 'COLOR'),
        choices: "NO_KEYS",
        trial_duration: null,
        data: {
            task: 'dccs',
            phase: 'color_practice',
            trial_num: index + 1,
            dimension: 'color',
            correct_response: trial.correct,
            target: trial.target.name
        },
        on_load: function() {
            setupTrial(jsPsych, trial, 'color_practice', index + 1, 'color', true);
        }
    };
    
    return practiceTrial;
}

function createColorTestInstructions() {
    const instructions = [
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: `
                <div style="max-width: 600px; margin: auto;">
                    <h2>Now, let's play with different SHAPES and COLORS</h2>
                    <p style="font-size: 18px;">
                        This time we'll use BALLS and TRUCKS that are ORANGE and BLUE.
                    </p>
                    <p style="font-size: 18px;">
                        Like before, choose the picture that's the same COLOR.
                    </p>
                    <div style="display: flex; justify-content: center; gap: 30px; margin: 30px 0;">
                        <div class="instructions-card">
                            <p>If it's <strong>BLUE</strong>:</p>
                            <img src="${STIMULI.blueBall.img}" alt="blue ball">
                        </div>
                        <div class="instructions-card">
                            <p>If it's <strong>ORANGE</strong>:</p>
                            <img src="${STIMULI.orangeTruck.img}" alt="orange truck">
                        </div>
                    </div>
                </div>
            `,
            choices: ['Start'],
            on_load: function() {
                playAudio("Now, we're going to play with some different SHAPES and COLORS. This time we'll use BALLS and TRUCKS that are ORANGE and BLUE.");
            }
        },
        {
            type: jsPsychHtmlButtonResponse,
            stimulus: '<h2>Ready?</h2><p>Go as fast as you can without making mistakes!</p>',
            choices: ['Start'],
            on_load: function() {
                playAudio("Now it's your turn. Go as fast as you can without making mistakes.");
            }
        }
    ];
    
    return instructions;
}

function createTestTrial(
    jsPsych: JsPsych,
    trial: Trial,
    phase: string,
    dimension: string,
    index: number
) {
    const testTrial = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: createTrialStimulus(trial.target, trial.left, trial.right, dimension.toUpperCase()),
        choices: "NO_KEYS",
        trial_duration: null,
        data: {
            task: 'dccs',
            phase: phase,
            trial_num: index + 1,
            dimension: dimension,
            correct_response: trial.correct,
            target: trial.target.name
        },
        on_load: function() {
            setupTrial(jsPsych, trial, phase, index + 1, dimension, false);
        }
    };
    
    return testTrial;
}

function createShapeInstructions() {
    const instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div style="max-width: 600px; margin: auto;">
                <h2>Now, we're going to play the SHAPE game</h2>
                <p style="font-size: 18px;">
                    In the SHAPE game, choose the picture that's the same SHAPE as the picture at the top.
                </p>
                <div style="display: flex; justify-content: center; gap: 30px; margin: 30px 0;">
                    <div class="instructions-card">
                        <p>If it's a <strong>TRUCK</strong>:</p>
                        <img src="${STIMULI.orangeTruck.img}" alt="truck">
                    </div>
                    <div class="instructions-card">
                        <p>If it's a <strong>BALL</strong>:</p>
                        <img src="${STIMULI.blueBall.img}" alt="ball">
                    </div>
                </div>
            </div>
        `,
        choices: ['Start Shape Game'],
        on_load: function() {
            playAudio("Now, we're going to play the SHAPE game. In the SHAPE game, choose the picture that's the same SHAPE as the picture at the top.");
        }
    };
    
    return instructions;
}

function createMixedInstructions() {
    const instructions = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div style="max-width: 600px; margin: auto;">
                <h2>Now we'll play both games together!</h2>
                <p style="font-size: 18px;">Remember:</p>
                <ul style="font-size: 18px; text-align: left; max-width: 400px; margin: 20px auto;">
                    <li>When you see "SHAPE", choose the same SHAPE</li>
                    <li>When you see "COLOR", choose the same COLOR</li>
                </ul>
                <p style="font-size: 18px;">Go as fast as you can without making mistakes!</p>
            </div>
        `,
        choices: ['Start Mixed Trials'],
        on_load: function() {
            playAudio("We can also play both games together. Remember, when you see the word SHAPE, choose the picture that is the same shape. When you see the word COLOR, choose the picture that is the same color.");
        }
    };
    
    return instructions;
}

function createResults(jsPsych: JsPsych) {
    const results = {
        type: jsPsychHtmlButtonResponse,
        stimulus: function() {
            const data = jsPsych.data.get().filter({task: 'dccs'});
            const colorTrials = data.filter({phase: 'color_test'});
            const shapeTrials = data.filter({phase: 'shape_test'});
            const mixedTrials = data.filter({phase: 'mixed'});
            
            const colorAccuracy = colorTrials.filter({correct: true}).count() / colorTrials.count() * 100;
            const shapeAccuracy = shapeTrials.filter({correct: true}).count() / shapeTrials.count() * 100;
            const mixedAccuracy = mixedTrials.filter({correct: true}).count() / mixedTrials.count() * 100;
            
            const colorRT = colorTrials.filter({correct: true}).select('rt').mean() / 1000;
            const shapeRT = shapeTrials.filter({correct: true}).select('rt').mean() / 1000;
            const mixedRT = mixedTrials.filter({correct: true}).select('rt').mean() / 1000;
            
            return `
                <div style="max-width: 600px; margin: auto;">
                    <h1>Great job! You've completed the task!</h1>
                    <h2>Your Results:</h2>
                    <table style="margin: 20px auto; font-size: 18px; border-collapse: collapse;">
                        <tr>
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Phase</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Accuracy</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Avg Response Time</th>
                        </tr>
                        <tr>
                            <td style="padding: 10px;">Color Trials</td>
                            <td style="padding: 10px; text-align: center;">${colorAccuracy.toFixed(0)}%</td>
                            <td style="padding: 10px; text-align: center;">${colorRT.toFixed(1)}s</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px;">Shape Trials</td>
                            <td style="padding: 10px; text-align: center;">${shapeAccuracy.toFixed(0)}%</td>
                            <td style="padding: 10px; text-align: center;">${shapeRT.toFixed(1)}s</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px;">Mixed Trials</td>
                            <td style="padding: 10px; text-align: center;">${mixedAccuracy.toFixed(0)}%</td>
                            <td style="padding: 10px; text-align: center;">${mixedRT.toFixed(1)}s</td>
                        </tr>
                    </table>
                </div>
            `;
        },
        choices: ['View Data']
    };
    
    return results;
}

/* Pre-defined trials */
const COLOR_PRACTICE_TRIALS: Trial[] = [
    { target: STIMULI.brownRabbit, left: STIMULI.brownBoat, right: STIMULI.whiteRabbit, correct: 0 },
    { target: STIMULI.whiteBoat, left: STIMULI.brownBoat, right: STIMULI.whiteRabbit, correct: 1 },
    { target: STIMULI.brownBoat, left: STIMULI.brownBoat, right: STIMULI.whiteRabbit, correct: 0 },
    { target: STIMULI.whiteRabbit, left: STIMULI.brownBoat, right: STIMULI.whiteRabbit, correct: 1 },
    { target: STIMULI.brownRabbit, left: STIMULI.whiteRabbit, right: STIMULI.brownBoat, correct: 1 }
];

const COLOR_TEST_TRIALS: Trial[] = [
    { target: STIMULI.blueTruck, left: STIMULI.blueBall, right: STIMULI.orangeTruck, correct: 0 },
    { target: STIMULI.orangeBall, left: STIMULI.blueBall, right: STIMULI.orangeTruck, correct: 1 },
    { target: STIMULI.blueBall, left: STIMULI.orangeTruck, right: STIMULI.blueBall, correct: 1 },
    { target: STIMULI.orangeTruck, left: STIMULI.blueBall, right: STIMULI.orangeTruck, correct: 1 },
    { target: STIMULI.blueTruck, left: STIMULI.orangeTruck, right: STIMULI.blueBall, correct: 1 }
];

const SHAPE_TEST_TRIALS: Trial[] = [
    { target: STIMULI.orangeBall, left: STIMULI.blueBall, right: STIMULI.orangeTruck, correct: 0 },
    { target: STIMULI.blueTruck, left: STIMULI.blueBall, right: STIMULI.orangeTruck, correct: 1 },
    { target: STIMULI.orangeTruck, left: STIMULI.orangeTruck, right: STIMULI.blueBall, correct: 0 },
    { target: STIMULI.blueBall, left: STIMULI.orangeTruck, right: STIMULI.blueBall, correct: 1 },
    { target: STIMULI.blueTruck, left: STIMULI.blueBall, right: STIMULI.orangeTruck, correct: 1 }
];

/* Main timeline creation function */
export function createTimeline(
    jsPsych: JsPsych,
    {
        practiceTrials = DEFAULT_PRACTICE_TRIALS,
        testTrials = DEFAULT_TEST_TRIALS,
        mixedTrials = DEFAULT_MIXED_TRIALS,
        showInstructions = true,
        showResults = true
    }: {
        practiceTrials?: number,
        testTrials?: number,
        mixedTrials?: number,
        showInstructions?: boolean,
        showResults?: boolean
    } = {}
) {
    // Reset state for new timeline
    resetState();
    
    const timeline: any[] = [];
    
    // Welcome screen
    timeline.push(createWelcome());
    
    // Color practice phase
    if (showInstructions) {
        timeline.push(...createColorInstructions());
    }
    
    // Add practice trials
    COLOR_PRACTICE_TRIALS.slice(0, practiceTrials).forEach((trial, index) => {
        timeline.push(createPracticeTrial(jsPsych, trial, index));
    });
    
    // Color test phase
    if (showInstructions) {
        timeline.push(...createColorTestInstructions());
    }
    
    // Add color test trials
    COLOR_TEST_TRIALS.slice(0, testTrials).forEach((trial, index) => {
        timeline.push(createTestTrial(jsPsych, trial, 'color_test', 'color', index));
    });
    
    // Shape test phase
    if (showInstructions) {
        timeline.push(createShapeInstructions());
    }
    
    // Add shape test trials
    SHAPE_TEST_TRIALS.slice(0, testTrials).forEach((trial, index) => {
        timeline.push(createTestTrial(jsPsych, trial, 'shape_test', 'shape', index));
    });
    
    // Mixed phase
    if (showInstructions) {
        timeline.push(createMixedInstructions());
    }
    
    // Generate and add mixed trials
    const mixedTrialsList = generateMixedTrials(mixedTrials);
    mixedTrialsList.forEach((trial, index) => {
        timeline.push(createTestTrial(jsPsych, trial, 'mixed', trial.dimension!, index));
    });
    
    // Results
    if (showResults) {
        timeline.push(createResults(jsPsych));
    }
    
    return timeline;
}

/* Export individual components for custom timeline building */
export const timelineComponents = {
    createWelcome,
    createColorInstructions,
    createPracticeTrial,
    createColorTestInstructions,
    createTestTrial,
    createShapeInstructions,
    createMixedInstructions,
    createResults
};

/* Export utility functions */
export const utils = {
    resetState,
    playAudio,
    createTrialStimulus,
    setupTrial,
    generateMixedTrials
};

/* Export types */
export type { Stimulus, Trial, TrialData, GameState };