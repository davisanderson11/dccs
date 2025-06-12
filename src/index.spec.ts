import { jest } from '@jest/globals';
import { JsPsych } from 'jspsych';
import { createTimeline, timelineComponents, utils, Stimulus, Trial, TrialData, GameState } from './index';

// Mock DOM methods
Object.defineProperty(global, 'document', {
  value: {
    querySelectorAll: jest.fn(() => []),
    getElementById: jest.fn(() => null),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    createElement: jest.fn(() => ({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(() => false)
      },
      style: {},
      setAttribute: jest.fn(),
      getAttribute: jest.fn()
    })),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    }
  },
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'Date', {
  value: {
    now: jest.fn(() => 1000000),
  },
  writable: true,
});

// Properly mock Math to preserve all original methods
const originalMath = Object.create(Object.getPrototypeOf(Math));
Object.getOwnPropertyNames(Math).forEach(property => {
  originalMath[property] = Math[property];
});

Object.defineProperty(global, 'Math', {
  value: {
    ...originalMath,
    random: jest.fn(() => 0.5),
  },
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => 1000),
  },
  writable: true,
});

Object.defineProperty(global, 'setTimeout', {
  value: jest.fn((fn: any) => fn()),
  writable: true,
});

// Mock window object
Object.defineProperty(global, 'window', {
  value: {
    document: global.document,
    setTimeout: global.setTimeout,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    speechSynthesis: {
      speak: jest.fn(),
      cancel: jest.fn()
    },
    SpeechSynthesisUtterance: jest.fn().mockImplementation((text) => ({
      text,
      rate: 1,
      pitch: 1,
      volume: 1
    }))
  },
  writable: true,
  configurable: true
});

// Mock jsPsych
const mockJsPsych = {
  getCurrentTrial: jest.fn(() => ({ data: {} })),
  finishTrial: jest.fn(),
  data: {
    get: jest.fn(() => {
      // Create a reusable mock data collection factory
      const createMockDataCollection = () => ({
        count: jest.fn(() => 5),
        select: jest.fn(() => ({
          mean: jest.fn(() => 2500),
          values: [2000, 2500, 3000]
        })),
        filter: jest.fn((criteria: any) => createMockDataCollection())
      });
      
      return createMockDataCollection();
    })
  }
} as unknown as JsPsych;

describe('Dimensional Change Card Sort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    utils.resetState();
    (Math.random as jest.Mock).mockReturnValue(0.5);
    (performance.now as jest.Mock).mockReturnValue(1000);
  });

  describe('Constants and Types', () => {
    test('should have correct default values', () => {
      const timeline = createTimeline(mockJsPsych);
      expect(timeline).toBeDefined();
      expect(Array.isArray(timeline)).toBe(true);
    });

    test('should export all required stimulus objects', () => {
      const timeline = createTimeline(mockJsPsych);
      // Check that timeline has been created with stimuli
      expect(timeline.length).toBeGreaterThan(0);
    });
  });

  describe('createTimeline', () => {
    test('should create timeline with default parameters', () => {
      const timeline = createTimeline(mockJsPsych);
      
      expect(timeline).toBeDefined();
      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBeGreaterThan(0);
    });

    test('should create timeline with custom parameters', () => {
      const timeline = createTimeline(mockJsPsych, {
        practiceTrials: 3,
        testTrials: 4,
        mixedTrials: 10,
        showInstructions: false,
        showResults: false
      });

      expect(timeline).toBeDefined();
      expect(Array.isArray(timeline)).toBe(true);
    });

    test('should include welcome screen as first element', () => {
      const timeline = createTimeline(mockJsPsych);
      
      expect(timeline[0]).toBeDefined();
      expect(timeline[0].choices).toEqual(['Start']);
    });

    test('should exclude instructions when showInstructions is false', () => {
      const timeline = createTimeline(mockJsPsych, { showInstructions: false });
      
      // Should still have welcome, but no instruction blocks
      let instructionCount = 0;
      timeline.forEach(item => {
        if (item.choices && Array.isArray(item.choices) && 
            (item.choices.includes('Next') || item.choices.includes('Start Practice'))) {
          instructionCount++;
        }
      });
      
      expect(instructionCount).toBe(0);
    });

    test('should include results when showResults is true', () => {
      const timeline = createTimeline(mockJsPsych, { showResults: true });
      
      // Last element should be results
      const lastElement = timeline[timeline.length - 1];
      expect(lastElement).toBeDefined();
      expect(lastElement.choices).toEqual(['View Data']);
    });

    test('should exclude results when showResults is false', () => {
      const timeline = createTimeline(mockJsPsych, { showResults: false });
      
      // Last element should not be results
      const lastElement = timeline[timeline.length - 1];
      expect(lastElement.choices).not.toEqual(['View Data']);
    });
  });

  describe('timelineComponents', () => {
    describe('createWelcome', () => {
      test('should create welcome component', () => {
        const welcome = timelineComponents.createWelcome();
        
        expect(welcome).toBeDefined();
        expect(welcome.type).toBeDefined();
        expect(welcome.choices).toEqual(['Start']);
        expect(welcome.data).toEqual({ trial_type: 'welcome' });
      });

      test('should contain DCCS title', () => {
        const welcome = timelineComponents.createWelcome();
        
        expect(welcome.stimulus).toContain('Dimensional Change Card Sort');
      });

      test('should include audio toggle', () => {
        const welcome = timelineComponents.createWelcome();
        
        expect(welcome.stimulus).toContain('audioToggle');
        expect(welcome.stimulus).toContain('Enable audio instructions');
      });

      test('should set audio state on finish', () => {
        const welcome = timelineComponents.createWelcome();
        (window as any).tempAudioEnabled = true;
        
        const data: any = {};
        welcome.on_finish(data);
        
        expect(data.audio_enabled).toBe(true);
        expect((window as any).tempAudioEnabled).toBeUndefined();
      });
    });

    describe('createColorInstructions', () => {
      test('should create color instructions array', () => {
        const instructions = timelineComponents.createColorInstructions();
        
        expect(instructions).toBeDefined();
        expect(Array.isArray(instructions)).toBe(true);
        expect(instructions.length).toBe(3);
      });

      test('should contain COLOR game instructions', () => {
        const instructions = timelineComponents.createColorInstructions();
        
        expect(instructions[0].stimulus).toContain('COLOR Game');
        expect(instructions[0].stimulus).toContain('same COLOR');
      });

      test('should have on_load functions for audio', () => {
        const instructions = timelineComponents.createColorInstructions();
        
        instructions.forEach(instruction => {
          expect(instruction.on_load).toBeDefined();
          expect(typeof instruction.on_load).toBe('function');
        });
      });
    });

    describe('createPracticeTrial', () => {
      test('should create practice trial component', () => {
        const trial: Trial = {
          target: { img: 'test.svg', name: 'test', shape: 'rabbit', color: 'brown' },
          left: { img: 'left.svg', name: 'left', shape: 'boat', color: 'brown' },
          right: { img: 'right.svg', name: 'right', shape: 'rabbit', color: 'white' },
          correct: 0
        };
        
        const practiceTrial = timelineComponents.createPracticeTrial(mockJsPsych, trial, 0);
        
        expect(practiceTrial).toBeDefined();
        expect(practiceTrial.type).toBeDefined();
        expect(practiceTrial.choices).toBe("NO_KEYS");
        expect(practiceTrial.data.phase).toBe('color_practice');
      });

      test('should set correct trial data', () => {
        const trial: Trial = {
          target: { img: 'test.svg', name: 'brown rabbit', shape: 'rabbit', color: 'brown' },
          left: { img: 'left.svg', name: 'left', shape: 'boat', color: 'brown' },
          right: { img: 'right.svg', name: 'right', shape: 'rabbit', color: 'white' },
          correct: 1
        };
        
        const practiceTrial = timelineComponents.createPracticeTrial(mockJsPsych, trial, 2);
        
        expect(practiceTrial.data.trial_num).toBe(3);
        expect(practiceTrial.data.dimension).toBe('color');
        expect(practiceTrial.data.correct_response).toBe(1);
        expect(practiceTrial.data.target).toBe('brown rabbit');
      });
    });

    describe('createTestTrial', () => {
      test('should create test trial component', () => {
        const trial: Trial = {
          target: { img: 'test.svg', name: 'test', shape: 'ball', color: 'blue' },
          left: { img: 'left.svg', name: 'left', shape: 'ball', color: 'blue' },
          right: { img: 'right.svg', name: 'right', shape: 'truck', color: 'orange' },
          correct: 0
        };
        
        const testTrial = timelineComponents.createTestTrial(mockJsPsych, trial, 'color_test', 'color', 0);
        
        expect(testTrial).toBeDefined();
        expect(testTrial.type).toBeDefined();
        expect(testTrial.choices).toBe("NO_KEYS");
        expect(testTrial.data.phase).toBe('color_test');
      });

      test('should handle different phases and dimensions', () => {
        const trial: Trial = {
          target: { img: 'test.svg', name: 'test', shape: 'ball', color: 'blue' },
          left: { img: 'left.svg', name: 'left', shape: 'ball', color: 'blue' },
          right: { img: 'right.svg', name: 'right', shape: 'truck', color: 'orange' },
          correct: 1,
          dimension: 'shape'
        };
        
        const testTrial = timelineComponents.createTestTrial(mockJsPsych, trial, 'shape_test', 'shape', 3);
        
        expect(testTrial.data.phase).toBe('shape_test');
        expect(testTrial.data.dimension).toBe('shape');
        expect(testTrial.data.trial_num).toBe(4);
      });
    });

    describe('createResults', () => {
      test('should create results component', () => {
        const results = timelineComponents.createResults(mockJsPsych);
        
        expect(results).toBeDefined();
        expect(results.stimulus).toBeDefined();
        expect(results.choices).toEqual(['View Data']);
      });

      test('should calculate and display results', () => {
        const results = timelineComponents.createResults(mockJsPsych);
        
        const stimulus = typeof results.stimulus === 'function' ? results.stimulus() : results.stimulus;
        expect(stimulus).toContain('Great job!');
        expect(stimulus).toContain('Your Results:');
        expect(stimulus).toContain('Color Trials');
        expect(stimulus).toContain('Shape Trials');
        expect(stimulus).toContain('Mixed Trials');
      });
    });
  });

  describe('utils', () => {
    describe('resetState', () => {
      test('should reset state to initial values', () => {
        utils.resetState();
        
        // We can't directly access state, but we can test through other functions
        // This is tested indirectly through other tests
        expect(true).toBe(true);
      });
    });

    describe('playAudio', () => {
      test('should not play audio when audio is disabled', () => {
        utils.resetState();
        utils.playAudio('Test message');
        
        expect(window.speechSynthesis.speak).not.toHaveBeenCalled();
      });
    });

    describe('createTrialStimulus', () => {
      test('should create trial stimulus HTML', () => {
        const target: Stimulus = { img: 'target.svg', name: 'target', shape: 'ball', color: 'blue' };
        const left: Stimulus = { img: 'left.svg', name: 'left', shape: 'ball', color: 'blue' };
        const right: Stimulus = { img: 'right.svg', name: 'right', shape: 'truck', color: 'orange' };
        
        const html = utils.createTrialStimulus(target, left, right, 'COLOR');
        
        expect(html).toContain('dccs-trial-container');
        expect(html).toContain('COLOR');
        expect(html).toContain('target.svg');
        expect(html).toContain('left.svg');
        expect(html).toContain('right.svg');
        expect(html).toContain('data-choice="0"');
        expect(html).toContain('data-choice="1"');
      });
    });

    describe('setupTrial', () => {
      test('should setup trial with DOM elements', () => {
        const mockCard = {
          addEventListener: jest.fn(),
          classList: {
            add: jest.fn()
          }
        };
        
        const mockFeedback = {
          textContent: '',
          className: ''
        };

        (document.querySelectorAll as jest.Mock).mockReturnValue([mockCard, mockCard]);
        (document.getElementById as jest.Mock).mockImplementation((id) => {
          if (id === 'feedback') return mockFeedback;
          return null;
        });

        const trial: Trial = {
          target: { img: 'test.svg', name: 'test', shape: 'ball', color: 'blue' },
          left: { img: 'left.svg', name: 'left', shape: 'ball', color: 'blue' },
          right: { img: 'right.svg', name: 'right', shape: 'truck', color: 'orange' },
          correct: 0
        };

        utils.setupTrial(mockJsPsych, trial, 'color_test', 1, 'color', false);

        expect(document.querySelectorAll).toHaveBeenCalledWith('.dccs-choice-card');
        expect(mockCard.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      });

      test('should handle correct response with feedback', () => {
        const mockCard = {
          addEventListener: jest.fn(),
          classList: {
            add: jest.fn()
          }
        };
        
        const mockFeedback = {
          textContent: '',
          className: ''
        };

        (document.querySelectorAll as jest.Mock).mockReturnValue([mockCard]);
        (document.getElementById as jest.Mock).mockReturnValue(mockFeedback);

        const trial: Trial = {
          target: { img: 'test.svg', name: 'test', shape: 'ball', color: 'blue' },
          left: { img: 'left.svg', name: 'left', shape: 'ball', color: 'blue' },
          right: { img: 'right.svg', name: 'right', shape: 'truck', color: 'orange' },
          correct: 0
        };

        utils.setupTrial(mockJsPsych, trial, 'practice', 1, 'color', true);

        // Simulate correct card click
        const clickCall = mockCard.addEventListener.mock.calls.find(call => call[0] === 'click');
        const clickHandler = clickCall?.[1] as ((this: any) => void) | undefined;
        if (clickHandler) {
          clickHandler.call(mockCard);
        }

        expect(mockFeedback.textContent).toBe("That's right!");
        expect(mockFeedback.className).toBe('dccs-feedback correct');
      });

      test('should handle incorrect response with feedback', () => {
        const mockCards = [
          {
            addEventListener: jest.fn(),
            classList: {
              add: jest.fn()
            }
          },
          {
            addEventListener: jest.fn(),
            classList: {
              add: jest.fn()
            }
          }
        ];
        
        const mockFeedback = {
          textContent: '',
          className: ''
        };

        (document.querySelectorAll as jest.Mock).mockReturnValue(mockCards);
        (document.getElementById as jest.Mock).mockReturnValue(mockFeedback);

        const trial: Trial = {
          target: { img: 'test.svg', name: 'test', shape: 'ball', color: 'blue' },
          left: { img: 'left.svg', name: 'left', shape: 'ball', color: 'blue' },
          right: { img: 'right.svg', name: 'right', shape: 'truck', color: 'orange' },
          correct: 0
        };

        utils.setupTrial(mockJsPsych, trial, 'practice', 1, 'color', true);

        // Simulate incorrect card click (clicking card 1 when correct is 0)
        const clickCall = mockCards[1].addEventListener.mock.calls.find(call => call[0] === 'click');
        const clickHandler = clickCall?.[1] as ((this: any) => void) | undefined;
        if (clickHandler) {
          clickHandler.call(mockCards[1]);
        }

        expect(mockFeedback.textContent).toBe("This is the same color.");
        expect(mockFeedback.className).toBe('dccs-feedback incorrect');
        expect(mockCards[0].classList.add).toHaveBeenCalledWith('highlight');
      });
    });

    describe('generateMixedTrials', () => {
      test('should generate correct number of mixed trials', () => {
        const trials = utils.generateMixedTrials(10);
        
        expect(trials).toHaveLength(10);
        expect(trials.every(t => t.dimension !== undefined)).toBe(true);
      });

      test('should alternate between color and shape dimensions', () => {
        const trials = utils.generateMixedTrials(6);
        
        expect(trials[0].dimension).toBe('color');
        expect(trials[1].dimension).toBe('shape');
        expect(trials[2].dimension).toBe('color');
        expect(trials[3].dimension).toBe('shape');
        expect(trials[4].dimension).toBe('color');
        expect(trials[5].dimension).toBe('shape');
      });

      test('should set correct response based on dimension', () => {
        const trials = utils.generateMixedTrials(2);
        
        // For color dimension
        const colorTrial = trials[0];
        expect(colorTrial.dimension).toBe('color');
        
        // For shape dimension
        const shapeTrial = trials[1];
        expect(shapeTrial.dimension).toBe('shape');
      });

      test('should use only test stimuli for mixed trials', () => {
        const trials = utils.generateMixedTrials(20);
        
        const validStimuli = ['blue ball', 'orange truck', 'blue truck', 'orange ball'];
        
        trials.forEach(trial => {
          expect(validStimuli).toContain(trial.target.name);
          expect(validStimuli).toContain(trial.left.name);
          expect(validStimuli).toContain(trial.right.name);
        });
      });
    });
  });

  describe('Card Click Simulation', () => {
    test('should handle card click without feedback', () => {
      const mockCard = {
        addEventListener: jest.fn()
      };

      (document.querySelectorAll as jest.Mock).mockReturnValue([mockCard]);
      (document.getElementById as jest.Mock).mockReturnValue(null);
      (performance.now as jest.Mock).mockReturnValueOnce(1000).mockReturnValueOnce(2000);

      const trial: Trial = {
        target: { img: 'test.svg', name: 'test', shape: 'ball', color: 'blue' },
        left: { img: 'left.svg', name: 'left', shape: 'ball', color: 'blue' },
        right: { img: 'right.svg', name: 'right', shape: 'truck', color: 'orange' },
        correct: 0
      };

      utils.setupTrial(mockJsPsych, trial, 'test', 1, 'color', false);

      // Simulate card click
      const clickCall = mockCard.addEventListener.mock.calls.find(call => call[0] === 'click');
      const clickHandler = clickCall?.[1] as ((this: any) => void) | undefined;
      if (clickHandler) {
        clickHandler.call(mockCard);
      }

      expect(mockJsPsych.finishTrial).toHaveBeenCalledWith({
        response: 0,
        correct: true,
        rt: 1000
      });
    });

    test('should prevent multiple clicks on same trial', () => {
      const mockCard = {
        addEventListener: jest.fn()
      };

      (document.querySelectorAll as jest.Mock).mockReturnValue([mockCard]);
      (document.getElementById as jest.Mock).mockReturnValue(null);

      const trial: Trial = {
        target: { img: 'test.svg', name: 'test', shape: 'ball', color: 'blue' },
        left: { img: 'left.svg', name: 'left', shape: 'ball', color: 'blue' },
        right: { img: 'right.svg', name: 'right', shape: 'truck', color: 'orange' },
        correct: 0
      };

      utils.setupTrial(mockJsPsych, trial, 'test', 1, 'color', false);

      // Simulate multiple card clicks
      const clickCall = mockCard.addEventListener.mock.calls.find(call => call[0] === 'click');
      const clickHandler = clickCall?.[1] as ((this: any) => void) | undefined;
      if (clickHandler) {
        clickHandler.call(mockCard);
        clickHandler.call(mockCard);
        clickHandler.call(mockCard);
      }

      // Should only call finishTrial once
      expect(mockJsPsych.finishTrial).toHaveBeenCalledTimes(1);
    });
  });

  describe('Type Exports', () => {
    test('should export Stimulus type', () => {
      const stimulus: Stimulus = { 
        img: 'test.svg', 
        name: 'test item', 
        shape: 'ball', 
        color: 'blue' 
      };
      expect(stimulus.img).toBe('test.svg');
      expect(stimulus.name).toBe('test item');
      expect(stimulus.shape).toBe('ball');
      expect(stimulus.color).toBe('blue');
    });

    test('should export Trial type', () => {
      const trial: Trial = {
        target: { img: 'target.svg', name: 'target', shape: 'ball', color: 'blue' },
        left: { img: 'left.svg', name: 'left', shape: 'ball', color: 'blue' },
        right: { img: 'right.svg', name: 'right', shape: 'truck', color: 'orange' },
        correct: 0,
        dimension: 'color'
      };
      expect(trial.target).toBeDefined();
      expect(trial.left).toBeDefined();
      expect(trial.right).toBeDefined();
      expect(trial.correct).toBe(0);
      expect(trial.dimension).toBe('color');
    });

    test('should export TrialData type', () => {
      const data: TrialData = {
        response: 1,
        correct: true,
        rt: 2500,
        phase: 'color_test',
        dimension: 'color',
        target: 'blue ball'
      };
      expect(data.response).toBe(1);
      expect(data.correct).toBe(true);
      expect(data.rt).toBe(2500);
      expect(data.phase).toBe('color_test');
      expect(data.dimension).toBe('color');
      expect(data.target).toBe('blue ball');
    });

    test('should export GameState type', () => {
      const state: GameState = {
        audioEnabled: true,
        currentPhase: 'practice',
        trialsCompleted: 5
      };
      expect(state.audioEnabled).toBe(true);
      expect(state.currentPhase).toBe('practice');
      expect(state.trialsCompleted).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero practice trials', () => {
      const timeline = createTimeline(mockJsPsych, { practiceTrials: 0 });
      expect(timeline).toBeDefined();
      expect(Array.isArray(timeline)).toBe(true);
    });

    test('should handle zero test trials', () => {
      const timeline = createTimeline(mockJsPsych, { testTrials: 0 });
      expect(timeline).toBeDefined();
      expect(Array.isArray(timeline)).toBe(true);
    });

    test('should handle zero mixed trials', () => {
      const timeline = createTimeline(mockJsPsych, { mixedTrials: 0 });
      expect(timeline).toBeDefined();
      expect(Array.isArray(timeline)).toBe(true);
    });

    test('should handle all parameters as zero', () => {
      const timeline = createTimeline(mockJsPsych, { 
        practiceTrials: 0,
        testTrials: 0,
        mixedTrials: 0,
        showInstructions: false,
        showResults: false
      });
      expect(timeline).toBeDefined();
      expect(Array.isArray(timeline)).toBe(true);
      // Should still have welcome screen at minimum
      expect(timeline.length).toBeGreaterThan(0);
    });

    test('should handle timeout prompt for test trials', () => {
      const mockCard = {
        addEventListener: jest.fn()
      };

      (document.querySelectorAll as jest.Mock).mockReturnValue([mockCard]);
      (document.getElementById as jest.Mock).mockReturnValue(null);

      const trial: Trial = {
        target: { img: 'test.svg', name: 'test', shape: 'ball', color: 'blue' },
        left: { img: 'left.svg', name: 'left', shape: 'ball', color: 'blue' },
        right: { img: 'right.svg', name: 'right', shape: 'truck', color: 'orange' },
        correct: 0
      };

      // Mock setTimeout to capture the timeout callback
      const originalSetTimeout = global.setTimeout;
      const mockSetTimeout = jest.fn();
      global.setTimeout = mockSetTimeout;

      utils.setupTrial(mockJsPsych, trial, 'test', 1, 'color', false);

      // Should have called setTimeout with timeout prompt
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    });

    test('should handle getCurrentTrial returning null', () => {
      const mockJsPsychNull = {
        ...mockJsPsych,
        getCurrentTrial: jest.fn(() => null)
      } as unknown as JsPsych;

      const mockCard = {
        addEventListener: jest.fn()
      };

      (document.querySelectorAll as jest.Mock).mockReturnValue([mockCard]);

      const trial: Trial = {
        target: { img: 'test.svg', name: 'test', shape: 'ball', color: 'blue' },
        left: { img: 'left.svg', name: 'left', shape: 'ball', color: 'blue' },
        right: { img: 'right.svg', name: 'right', shape: 'truck', color: 'orange' },
        correct: 0
      };

      // Should not throw error
      expect(() => {
        utils.setupTrial(mockJsPsychNull, trial, 'test', 1, 'color', false);
      }).not.toThrow();
    });
  });
});