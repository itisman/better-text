// ABOUTME: Script to generate extension icons using node-canvas
// ABOUTME: Creates professional icons in multiple sizes for the Chrome extension

const { createCanvas } = require('canvas');
const fs = require('fs');

function drawModernIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparency
    ctx.clearRect(0, 0, size, size);
    
    // Create gradient background
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size);
    gradient.addColorStop(0, '#764ba2');
    gradient.addColorStop(1, '#667eea');
    
    // Draw circle background
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw selection brackets
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = 'round';
    
    // Left bracket
    const bracketWidth = size * 0.15;
    const bracketHeight = size * 0.4;
    const bracketX = size * 0.2;
    const bracketY = (size - bracketHeight) / 2;
    
    ctx.beginPath();
    ctx.moveTo(bracketX + bracketWidth, bracketY);
    ctx.lineTo(bracketX, bracketY);
    ctx.lineTo(bracketX, bracketY + bracketHeight);
    ctx.lineTo(bracketX + bracketWidth, bracketY + bracketHeight);
    ctx.stroke();
    
    // Right bracket
    const rightBracketX = size * 0.8 - bracketWidth;
    
    ctx.beginPath();
    ctx.moveTo(rightBracketX, bracketY);
    ctx.lineTo(rightBracketX + bracketWidth, bracketY);
    ctx.lineTo(rightBracketX + bracketWidth, bracketY + bracketHeight);
    ctx.lineTo(rightBracketX, bracketY + bracketHeight);
    ctx.stroke();
    
    // Draw text lines in between
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size * 0.06;
    
    const lineY1 = size * 0.4;
    const lineY2 = size * 0.6;
    const lineStartX = size * 0.35;
    const lineEndX = size * 0.65;
    
    ctx.beginPath();
    ctx.moveTo(lineStartX, lineY1);
    ctx.lineTo(lineEndX, lineY1);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(lineStartX, lineY2);
    ctx.lineTo(lineEndX - size * 0.1, lineY2);
    ctx.stroke();
    
    return canvas;
}

// Generate icons in different sizes
const sizes = [16, 48, 128];

sizes.forEach(size => {
    const canvas = drawModernIcon(size);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`icon-${size}.png`, buffer);
    console.log(`Generated icon-${size}.png`);
});

console.log('All icons generated successfully!');