// Setup file for Jest to configure global environment

// Fix the SpeechSynthesisUtterance constructor
global.SpeechSynthesisUtterance = function(text) {
  this.text = text;
  this.rate = 1;
  this.pitch = 1;
  this.volume = 1;
};

// Fix Date.prototype.toUTCString for fake timers
if (!global.Date.prototype.toUTCString) {
  global.Date.prototype.toUTCString = function() {
    return this.toISOString().replace(/\.\d{3}Z$/, 'Z');
  };
}