let initialMousePos = { x: 0, y: 0 }; // Initial mouse position
let isDragging = false; // Flag to check if the mouse is dragged

// Track mouse movement
document.addEventListener("mousedown", (event) => {
  if (event.button === 2) { // Right mouse button
    initialMousePos = { x: event.clientX, y: event.clientY };
    isDragging = false;
  }
});

document.addEventListener("mousemove", (event) => {
  if (event.buttons === 2) { // Right mouse button is still held
    const distance = Math.sqrt(
      Math.pow(event.clientX - initialMousePos.x, 2) +
      Math.pow(event.clientY - initialMousePos.y, 2)
    );
    if (distance > 10) { // Threshold for dragging
      isDragging = true;
    }
  }
});

// Add event listener for right-clicks
document.addEventListener("contextmenu", (event) => {
  const target = event.target.closest("a");
  if (target && target.href && !isDragging) { // Only trigger if not dragged
    if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      chrome.runtime.sendMessage({ action: "openTab", url: target.href });
    }
  }
});
