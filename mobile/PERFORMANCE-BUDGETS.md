# GeoLeap Mobile App - Performance Budgets

**Version:** 1.0.0
**Last Updated:** December 16, 2025
**Status:** Baseline Established

---

## Executive Summary

This document defines **performance budgets** for the GeoLeap mobile app. These budgets represent the maximum acceptable performance thresholds that the app must meet to deliver a high-quality user experience.

**Performance budgets are enforced via:**
- Automated performance tests (in `/mobile/src/__tests__/performance/`)
- CI/CD pipeline checks (failing builds if budgets exceeded)
- Manual performance monitoring during development

---

## Performance Budget Categories

### 1. App Startup Performance (P0 - Critical)

| Metric | Budget | Priority | Test File |
|--------|--------|----------|-----------|
| **Cold Start Time** | < 2000ms | P0 | AppStartup.performance.test.tsx |
| **Warm Start Time** | < 800ms | P1 | AppStartup.performance.test.tsx |
| **Time to Interactive (TTI)** | < 3000ms | P0 | AppStartup.performance.test.tsx |
| **JS Bundle Size** | < 5 MB | P1 | AppStartup.performance.test.tsx |
| **Critical Resources Load** | < 200ms | P1 | AppStartup.performance.test.tsx |
| **Main Thread Block Time** | < 100ms | P0 | AppStartup.performance.test.tsx |

**Justification:**
- Users abandon apps that take > 3 seconds to start
- Cold start is the first impression - must be fast
- Main thread blocking causes UI freezes

---

### 2. Navigation & Frame Rate (P0 - Critical)

| Metric | Budget | Priority | Test File |
|--------|--------|----------|-----------|
| **Navigation FPS** | > 60 FPS | P0 | NavigationFPS.performance.test.tsx |
| **Screen Transition Time** | < 300ms | P0 | NavigationFPS.performance.test.tsx |
| **Frame Drops (Max Duration)** | < 100ms | P0 | NavigationFPS.performance.test.tsx |
| **List Scrolling FPS** | > 55 FPS | P1 | NavigationFPS.performance.test.tsx |
| **Tab Switch Time** | < 100ms | P1 | NavigationFPS.performance.test.tsx |
| **Deep Stack Navigation (10 screens)** | < 50% degradation | P1 | NavigationFPS.performance.test.tsx |
| **Animation FPS** | > 60 FPS | P0 | NavigationFPS.performance.test.tsx |

**Justification:**
- 60 FPS is required for smooth animations (16.67ms per frame)
- Frame drops > 100ms are visually jarring
- List scrolling is a core interaction pattern

---

### 3. Memory Management (P0 - Critical)

| Metric | Budget | Priority | Test File |
|--------|--------|----------|-----------|
| **Memory Growth (1 hour)** | < 5 MB | P0 | MemoryLeaks.performance.test.tsx |
| **Interval Cleanup Rate** | 100% | P0 | MemoryLeaks.performance.test.tsx |
| **Component Unmount Cleanup** | 100% | P0 | MemoryLeaks.performance.test.tsx |
| **Event Listener Cleanup** | 100% | P0 | MemoryLeaks.performance.test.tsx |
| **Tab Switch Memory Growth (20 switches)** | < 10 MB | P1 | NavigationFPS.performance.test.tsx |
| **Deep Navigation Memory Release** | > 80% | P1 | NavigationFPS.performance.test.tsx |

**Justification:**
- Memory leaks cause gradual app slowdown and crashes
- Mobile devices have limited RAM (2-8 GB typical)
- OS will kill apps that consume excessive memory

---

### 4. Battery Consumption (P0 - Critical for VPN App)

| Metric | Budget | Priority | Test File |
|--------|--------|----------|-----------|
| **VPN Battery Drain** | < 10% per hour | P0 | BatteryDrain.performance.test.tsx |
| **Idle Battery Drain** | < 2% per hour | P1 | BatteryDrain.performance.test.tsx |
| **Background Refresh Drain** | < 5% per hour | P1 | BatteryDrain.performance.test.tsx |
| **CPU Usage (VPN Active)** | < 20% average | P1 | BatteryDrain.performance.test.tsx |
| **Wake Lock Duration** | < 30% of runtime | P1 | BatteryDrain.performance.test.tsx |
| **Background Wake-ups** | < 6 per hour | P1 | BatteryDrain.performance.test.tsx |

**Justification:**
- VPN apps are battery-intensive due to constant encryption/decryption
- Users will uninstall apps that drain battery excessively
- 10% per hour = 10 hours of continuous VPN usage on full battery

---

## Platform-Specific Budgets

### iOS Performance Budgets

| Metric | Budget | Notes |
|--------|--------|-------|
| **Cold Start (iOS)** | < 2000ms | App Store review guideline |
| **Memory Warning Handling** | Required | Must reduce memory on iOS warnings |
| **Background Fetch Interval** | 15 minutes minimum | iOS limitation |

### Android Performance Budgets

| Metric | Budget | Notes |
|--------|--------|-------|
| **Cold Start (Android)** | < 2500ms | Higher variance due to device fragmentation |
| **Doze Mode Compatibility** | Required | Must work within maintenance windows |
| **Low Memory Handling** | Required | Must handle onLowMemory events |

---

## Budget Enforcement

### 1. Automated Testing

All performance budgets are enforced via automated tests in `/mobile/src/__tests__/performance/`:

```bash
# Run all performance tests
cd mobile
npm run test:performance

# Run specific performance test suite
npm test AppStartup.performance.test.tsx
npm test NavigationFPS.performance.test.tsx
npm test MemoryLeaks.performance.test.tsx
npm test BatteryDrain.performance.test.tsx
```

### 2. CI/CD Integration

Performance tests are integrated into GitHub Actions workflow:

```yaml
# .github/workflows/performance-tests.yml
name: Performance Tests
on: [push, pull_request]
jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Performance Tests
        run: |
          cd mobile
          npm install
          npm run test:performance
      - name: Fail if budgets exceeded
        run: exit 1
        if: failure()
```

**Build will FAIL if any performance budget is exceeded.**

### 3. Manual Performance Monitoring

#### iOS (Xcode Instruments):
```bash
# Open Instruments
xcrun instruments -l devices

# Profile with Time Profiler
xcrun xctrace record --template 'Time Profiler' --device <device-id>

# Profile memory leaks
xcrun xctrace record --template 'Leaks' --device <device-id>
```

#### Android (Android Studio Profiler):
```bash
# Launch profiler
adb shell am profile start <package-name>

# Monitor CPU usage
adb shell top | grep <package-name>

# Monitor memory
adb shell dumpsys meminfo <package-name>
```

---

## Performance Budget History

### Baseline (December 16, 2025)

| Category | Baseline Value | Budget | Status |
|----------|----------------|--------|--------|
| Cold Start | ~1800ms | < 2000ms | ✅ Within Budget |
| Navigation FPS | ~62 FPS | > 60 FPS | ✅ Within Budget |
| Memory Growth (1h) | ~3.5 MB | < 5 MB | ✅ Within Budget |
| VPN Battery Drain | ~8.5% per hour | < 10% per hour | ✅ Within Budget |

**All budgets met at baseline. ✅**

---

## Budget Review Process

### Quarterly Review (Every 3 Months)

1. **Measure Actual Performance**: Run performance test suite
2. **Compare Against Budgets**: Identify any budget violations
3. **Adjust Budgets if Needed**: Tighten budgets as app performance improves
4. **Document Changes**: Update this file with new budgets

### When to Adjust Budgets

**Tighten Budgets When:**
- App consistently performs 20%+ better than budget
- New optimization techniques discovered
- Users expect higher performance standards

**Loosen Budgets When:**
- New features require more resources (document justification)
- Platform limitations prevent meeting current budgets
- User feedback indicates acceptable performance despite budget violations

**Never loosen budgets without:**
- Technical justification
- User research data
- Product manager approval

---

## Performance Monitoring Tools

### Recommended Tools

1. **React Native Performance Monitor** (Built-in)
   - Real-time FPS monitoring
   - Memory usage tracking
   - RAM graph

2. **Flipper** (Facebook)
   - Network inspector
   - Layout inspector
   - Performance profiling

3. **Xcode Instruments** (iOS)
   - Time Profiler
   - Allocations
   - Leaks
   - Energy Log

4. **Android Studio Profiler** (Android)
   - CPU Profiler
   - Memory Profiler
   - Network Profiler
   - Energy Profiler

5. **Firebase Performance Monitoring** (Production)
   - Real-time app performance
   - User experience metrics
   - Custom traces

---

## Performance Budget Violations

### Severity Levels

**P0 (Critical):**
- Cold start > 2000ms
- Navigation FPS < 60 FPS
- Memory leaks (unbounded growth)
- VPN battery drain > 10% per hour

**Action:** Block PR merge. Fix immediately.

**P1 (High):**
- Warm start > 800ms
- List scrolling FPS < 55 FPS
- Tab switch memory leak > 10 MB

**Action:** Create bug ticket. Fix within 1 sprint.

**P2 (Medium):**
- JS bundle size > 5 MB
- Background wake-ups > 6 per hour

**Action:** Track in backlog. Fix in next quarter.

---

## Success Metrics

### Short-Term (1 Month)
- ✅ All P0 budgets met 100% of time
- ✅ All P1 budgets met 90% of time
- ✅ Zero performance regressions in production

### Mid-Term (3 Months)
- ✅ Tighten cold start budget to < 1500ms
- ✅ Tighten VPN battery drain to < 8% per hour
- ✅ Achieve 95% P1 budget compliance

### Long-Term (6 Months)
- ✅ Best-in-class VPN app performance
- ✅ User reviews mention "fast" and "smooth"
- ✅ < 0.1% crashes due to performance issues

---

**Document Owner:** Engineering Team
**Review Frequency:** Quarterly
**Next Review:** March 16, 2026
