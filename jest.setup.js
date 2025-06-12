// Setup file for Jest to configure global environment

// Fix the SpeechSynthesisUtterance constructor
global.SpeechSynthesisUtterance = function(text) {
  this.text = text;
  this.rate = 1;
  this.pitch = 1;
  this.volume = 1;
};

// Fix Date.prototype.toUTCString for fake timers
// Save the original Date constructor
const OriginalDate = global.Date;

// Create a safer Date constructor that ensures all prototype methods exist
function SafeDate(...args) {
  if (args.length === 0) {
    return new OriginalDate();
  }
  return new OriginalDate(...args);
}

// Copy all static methods and properties
Object.setPrototypeOf(SafeDate, OriginalDate);
SafeDate.prototype = OriginalDate.prototype;

// Ensure toUTCString exists on the prototype
if (!SafeDate.prototype.toUTCString) {
  SafeDate.prototype.toUTCString = function() {
    return this.toISOString().replace(/\.\d{3}Z$/, 'Z');
  };
}

// Replace the global Date
global.Date = SafeDate;