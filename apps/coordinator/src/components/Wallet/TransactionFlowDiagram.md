# Transaction Flow Diagram

## Overview

The `TransactionFlowDiagram` component provides an innovative, visually stunning way to understand Bitcoin transactions in Caravan. It goes beyond traditional transaction viewers by presenting a clear, color-coded flow from inputs through to outputs, helping users understand exactly where their bitcoin is going.

## Design Philosophy

### Inspiration
This component was designed to surpass existing transaction visualizations like:
- **mempool.space**: Great for technical users but can be overwhelming
- **Sparrow Wallet**: Good flow but lacks clear visual hierarchy

### Key Innovations

1. **Color-Coded Flow**: Each output type has a distinct, meaningful color:
   - 🟠 **Orange/Gold (#ea9c0d)**: Recipient outputs (where you're sending)
   - 🟢 **Green**: Change outputs (returning to your wallet)
   - 🔴 **Red**: Network fees (paid to miners)
   - 🔵 **Blue**: Input pool (your UTXOs)

2. **Visual Hierarchy**: 
   - Larger, prominent cards for recipient outputs
   - Clear distinction between change and payment
   - Summary sidebar for quick understanding

3. **Educational**: 
   - Icons help identify each component (Savings icon for change, Gas icon for fees)
   - Tooltips reveal full addresses
   - Summary shows percentages and breakdowns

4. **Responsive Design**:
   - Desktop: Horizontal flow with beautiful SVG curves
   - Mobile: Vertical stack with clear flow indicators

## Features

### Input Display
- Shows up to 3 inputs with full details
- Collapsible "+N more inputs" for transactions with many inputs
- Script type badges (P2WSH, P2SH-P2WSH, P2SH)
- Individual UTXO amounts
- Beautiful gradient background with glass-morphism effects

### Output Categorization
- **Recipients**: Gold/orange gradient - the actual payment(s)
- **Change**: Green gradient - money returning to your wallet
- **Fee**: Red gradient - network fee to miners

### Summary Section
Provides at-a-glance understanding:
- Total amount sending to recipients
- Total change returning
- Network fee amount and percentage
- Total input amount

### Interactive Elements
- Hover effects on all cards
- Tooltips showing full addresses
- Smooth transitions and animations
- Glass-morphism and gradient effects

### Script Type Indicators
Each output shows its script type:
- P2WSH (Native SegWit)
- P2SH-P2WSH (Nested SegWit)
- P2SH (Legacy)
- P2WPKH, P2PKH (Single-sig variants)

Color-coded by security/efficiency:
- Green: SegWit (most efficient)
- Blue: Nested SegWit
- Orange: Legacy

## Usage

```tsx
import TransactionFlowDiagram from './TransactionFlowDiagram';

<TransactionFlowDiagram
  inputs={inputs}
  outputs={outputs}
  fee={feeInBTC}
  changeAddress={changeAddress}
  inputsTotalSats={inputsTotalSats}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `inputs` | `Array<Input>` | Array of transaction inputs (UTXOs) |
| `outputs` | `Array<Output>` | Array of transaction outputs |
| `fee` | `string` | Transaction fee in BTC |
| `changeAddress` | `string` | (Optional) Address receiving change |
| `inputsTotalSats` | `any` | Total input amount in satoshis |

## Design System Integration

### Colors Used
- Primary Blue (`#00478E`, `#1976d2`): Input pool
- Orange/Gold (`#ea9c0d`): Recipients
- Success Green (MUI theme): Change outputs
- Error Red (MUI theme): Fees
- Grey (`#e0e0e0`): Secondary elements

### Typography
- Headers: Roboto, 600 weight
- Amounts: Roboto, 700 weight
- Addresses: Monospace
- Labels: Uppercase, letter-spacing for clarity

### Effects
- **Gradients**: Linear gradients for depth
- **Shadows**: Layered shadows for elevation
- **Glass-morphism**: Semi-transparent overlays with backdrop blur
- **Hover states**: Transform and shadow transitions

## Responsive Breakpoints

- **Mobile (< 600px)**: 
  - Vertical stack layout
  - No SVG flow lines (replaced with arrow)
  - Full-width cards
  
- **Tablet (600px - 960px)**:
  - Adjusted spacing
  - Two-column layout for summary
  
- **Desktop (> 960px)**:
  - Full horizontal flow
  - SVG curved flow lines
  - Four-column layout

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Sufficient color contrast ratios
- Keyboard navigation support (via MUI)
- Tooltips for additional context

## Technical Details

### Performance
- `useMemo` for expensive calculations
- Conditional rendering for large input lists
- Optimized SVG paths
- CSS transforms for animations (GPU-accelerated)

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires SVG support (99%+ coverage)
- Falls back gracefully on older browsers

## Future Enhancements

Potential improvements:
- [ ] Animated flow (particles moving from inputs to outputs)
- [ ] Drag to reorder outputs
- [ ] Export as image
- [ ] Dark mode support
- [ ] Accessibility improvements (screen reader optimization)
- [ ] Show more detailed input information in expanded view
- [ ] RBF/CPFP indicators

## Credits

Designed and implemented for Caravan by Claude with inspiration from:
- mempool.space transaction viewer
- Sparrow Wallet transaction diagram
- Modern fintech UI/UX patterns
