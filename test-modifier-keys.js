// ABOUTME: Test script to verify modifier key detection works properly
// ABOUTME: This script tests the isModifierActive function with various scenarios

// Load the content script logic for testing
const modifierClickSettings = {
  enabled: true,
  preferredModifier: 'auto',
  smartCrossPlatform: true
};

// Mock navigator.platform for testing
function mockPlatform(platform) {
  Object.defineProperty(navigator, 'platform', {
    writable: true,
    value: platform
  });
}

// Test function that simulates isModifierActive
function isModifierActive(event) {
  if (!modifierClickSettings.enabled) return false;
  
  const isMac = navigator.platform.toLowerCase().includes('mac');
  const modifier = modifierClickSettings.preferredModifier;
  
  switch (modifier) {
    case 'ctrl':
      return event.ctrlKey;
    case 'alt':
      return event.altKey;
    case 'shift':
      return event.shiftKey;
    case 'auto':
      if (modifierClickSettings.smartCrossPlatform) {
        return isMac ? event.metaKey : event.ctrlKey;
      } else {
        return event.ctrlKey;
      }
    default:
      return false;
  }
}

// Test cases
function runTests() {
  console.log('Running modifier key tests...\n');
  
  // Test 1: Mac platform with auto mode
  mockPlatform('MacIntel');
  const macEvent = { ctrlKey: false, altKey: false, shiftKey: false, metaKey: true };
  console.log('Test 1 - Mac with Command key (auto mode):');
  console.log('Platform:', navigator.platform);
  console.log('Event:', macEvent);
  console.log('Result:', isModifierActive(macEvent));
  console.log('Expected: true\n');
  
  // Test 2: Windows platform with auto mode
  mockPlatform('Win32');
  const winEvent = { ctrlKey: true, altKey: false, shiftKey: false, metaKey: false };
  console.log('Test 2 - Windows with Ctrl key (auto mode):');
  console.log('Platform:', navigator.platform);
  console.log('Event:', winEvent);
  console.log('Result:', isModifierActive(winEvent));
  console.log('Expected: true\n');
  
  // Test 3: Alt key on any platform
  modifierClickSettings.preferredModifier = 'alt';
  const altEvent = { ctrlKey: false, altKey: true, shiftKey: false, metaKey: false };
  console.log('Test 3 - Alt key mode:');
  console.log('Event:', altEvent);
  console.log('Result:', isModifierActive(altEvent));
  console.log('Expected: true\n');
  
  // Test 4: Disabled modifier click
  modifierClickSettings.enabled = false;
  console.log('Test 4 - Modifier click disabled:');
  console.log('Event:', altEvent);
  console.log('Result:', isModifierActive(altEvent));
  console.log('Expected: false\n');
  
  console.log('All tests completed!');
}

// Run the tests
runTests();