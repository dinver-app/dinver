# Auto-Approve Status: DISABLED

## Current Configuration

**Status:** ❌ Auto-approve is currently **DISABLED**

All receipts will go through manual review regardless of their auto-approve score.

## What Was Changed

### Backend (receiptController.js)

**File:** `src/controllers/receiptController.js`

```javascript
// Line 283-295
// NOTE: Auto-approve is DISABLED - all receipts go to manual review
// The autoApproveScore is calculated for tracking/monitoring purposes only
const receiptData = {
  // ...
  status: 'pending', // Always pending - no auto-approve
  // ...
};
```

**Line 354-362:** Response message no longer mentions auto-approve
```javascript
// Response - always pending for manual review
let message = 'Račun poslan na provjeru. Bodovi će biti dodijeljeni u roku 24 sata.';

// Add warning if fraud flags detected
if (fraudFlags.length > 0) {
  message = 'Račun poslan na provjeru. Detektirana potencijalna nepodudaranja.';
}
```

## What Still Works

✅ **OCR Extraction** - Google Vision + Parser + GPT fallback
✅ **Confidence Scoring** - All scores are calculated and stored
✅ **Fraud Detection** - Patterns and flags are detected
✅ **Auto-Approve Score** - Calculated and displayed (for monitoring)
✅ **Decision Engine** - Runs and provides score breakdown

## What Is Displayed

### Sysadmin Frontend - Receipt List

**New Column:** "OCR Score"
- Shows auto-approve score (0-100%)
- Color coded: 🟢 Green (≥80%), 🟡 Yellow (50-79%), 🔴 Red (<50%)
- Shows fraud flag count if any (⚠️ symbol)

### Sysadmin Frontend - Receipt Details

**New Section:** "OCR Metadata"
- OCR Method (vision / gpt / vision+gpt)
- Vision Confidence (%)
- Parser Confidence (%)
- Consistency Score (%)
- Auto-Approve Score (%) with "(for monitoring only)" label
- Fraud Flags (if any) with ⚠️ warning

## How to Enable Auto-Approve (Future)

If you decide to enable auto-approve in the future:

### Step 1: Update Backend Logic

**File:** `src/controllers/receiptController.js`

Around line 295, change:
```javascript
// FROM:
status: 'pending', // Always pending - no auto-approve

// TO:
status: autoApproveScore >= 0.8 ? 'approved' : 'pending',
```

### Step 2: Update Response Message

Around line 355, uncomment:
```javascript
// FROM:
let message = 'Račun poslan na provjeru. Bodovi će biti dodijeljeni u roku 24 sata.';

// TO:
let message = 'Račun poslan na provjeru. Bodovi će biti dodijeljeni u roku 24 sata.';
if (autoApproveScore >= 0.8) {
  message = 'Račun automatski odobren! Bodovi će biti dodijeljeni uskoro.';
} else if (fraudFlags.length > 0) {
  message = 'Račun poslan na detaljnu provjeru zbog sigurnosnih razloga.';
}
```

### Step 3: Award Points for Auto-Approved Receipts

You would need to add logic to immediately award points when `status === 'approved'` on creation, similar to the `approveReceipt` function.

**Example location:** After `Receipt.create()` around line 334

```javascript
const receipt = await Receipt.create(receiptData);

// If auto-approved, award points immediately
if (receipt.status === 'approved') {
  const pointsAwarded = Receipt.calculatePoints(
    receipt.totalAmount,
    receipt.hasReservationBonus || false
  );

  await UserPointsHistory.logPoints({
    userId: receipt.userId,
    actionType: 'receipt_approved',
    points: pointsAwarded,
    referenceId: receipt.id,
    restaurantId: receipt.restaurantId,
    description: `Račun odobren automatski - ${restaurant.name} (${receipt.totalAmount}€)`,
  });

  // Update receipt with points
  await receipt.update({ pointsAwarded });
}
```

### Step 4: Adjust Threshold (Optional)

Current threshold: **0.8** (80%)

To change the threshold, update the decision engine:

**File:** `src/services/decisionEngine.js` (line ~120)
```javascript
// Current
if (score >= 0.8) {
  decision = 'auto_approved';
}

// Example: Lower to 70%
if (score >= 0.7) {
  decision = 'auto_approved';
}
```

## Monitoring While Disabled

Even with auto-approve disabled, you should monitor:

1. **Auto-Approve Score Distribution**
   - Check how many receipts would have been auto-approved (≥80%)
   - Review scores in the 50-80% range
   - Investigate low scores (<50%)

2. **Fraud Flag Frequency**
   - Track most common fraud flags
   - Adjust detection rules if too many false positives

3. **Manual Review Time**
   - Average time to manually approve
   - Identify bottlenecks

4. **OCR Accuracy**
   - Vision confidence rates
   - Parser confidence rates
   - Fields that frequently need manual correction

## Testing Before Enabling

Before enabling auto-approve:

1. **Collect Data:** Review 100-200 manually approved receipts
2. **Check Scores:** See what % would have been auto-approved
3. **Verify Accuracy:** Ensure no false positives in that set
4. **Adjust Thresholds:** Based on data, tune to 0.7, 0.8, or 0.9
5. **Gradual Rollout:** Start with small percentage (10-20%)
6. **Monitor Closely:** Check for any issues in first 24-48 hours

## Questions?

- **Why is it disabled?** For initial testing and to ensure accuracy before automation
- **When to enable?** After validating OCR accuracy with real data
- **How to test?** Monitor the auto-approve scores for 1-2 weeks first
- **What if issues?** Can be disabled immediately by reverting the status line

---

**Last Updated:** 2025-11-03
**Status:** Auto-approve disabled for manual review period
**Next Review:** TBD (after analyzing initial data)
