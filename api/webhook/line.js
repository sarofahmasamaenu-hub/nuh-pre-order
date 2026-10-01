// api/webhook/line.ts
import crypto from "crypto";
import fs from "fs";
import path from "path";

// src/utils/lineMatcher.ts
var STATUS_MAP_TH = {
  RECEIVED: { label: "1. \u0E23\u0E31\u0E1A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22", desc: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E40\u0E02\u0E49\u0E32\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u{1F4CB}", badgeColor: "#3B82F6" },
  DESIGNING: { label: "2. \u0E2A\u0E23\u0E38\u0E1B\u0E41\u0E1A\u0E1A/\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E1C\u0E49\u0E32", desc: "\u0E27\u0E32\u0E07\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19 \u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A \u0E41\u0E25\u0E30\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E1C\u0E49\u0E32\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A", icon: "\u270F\uFE0F", badgeColor: "#6366F1" },
  FABRIC_ORDERED: { label: "\u0E2A\u0E31\u0E48\u0E07\u0E1C\u0E49\u0E32/\u0E2D\u0E30\u0E44\u0E2B\u0E25\u0E48", desc: "\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E23\u0E2D\u0E1C\u0E49\u0E32\u0E2B\u0E23\u0E37\u0E2D\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E2A\u0E31\u0E48\u0E07\u0E1E\u0E34\u0E40\u0E28\u0E29", icon: "\u{1F4E6}", badgeColor: "#8B5CF6" },
  FABRIC_RECEIVED: { label: "\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E1C\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27", desc: "\u0E1C\u0E49\u0E32\u0E41\u0E25\u0E30\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E08\u0E31\u0E14\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E02\u0E36\u0E49\u0E19\u0E41\u0E1A\u0E1A", icon: "\u{1F9F5}", badgeColor: "#8B5CF6" },
  PATTERN_MAKING: { label: "\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19", desc: "\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E1A\u0E1A\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19\u0E15\u0E32\u0E21\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E1A\u0E38\u0E04\u0E04\u0E25", icon: "\u{1F4D0}", badgeColor: "#EC4899" },
  CUTTING: { label: "3. \u0E02\u0E36\u0E49\u0E19\u0E41\u0E1A\u0E1A\u0E41\u0E25\u0E30\u0E15\u0E31\u0E14\u0E1C\u0E49\u0E32", desc: "\u0E0A\u0E48\u0E32\u0E07\u0E15\u0E31\u0E14\u0E1C\u0E49\u0E32\u0E15\u0E32\u0E21\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u2702\uFE0F", badgeColor: "#F59E0B" },
  SEWING: { label: "4. \u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A", desc: "\u0E0A\u0E48\u0E32\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E02\u0E36\u0E49\u0E19\u0E42\u0E04\u0E23\u0E07\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E40\u0E01\u0E47\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", icon: "\u{1FAA1}", badgeColor: "#F59E0B" },
  PATTERN_SEWING: { label: "\u0E17\u0E33\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19/\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A", desc: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19\u0E41\u0E25\u0E30\u0E40\u0E22\u0E47\u0E1A\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A\u0E0A\u0E38\u0E14", icon: "\u{1FAA1}", badgeColor: "#F59E0B" },
  FIRST_FITTING_READY: { label: "\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E25\u0E2D\u0E07\u0E42\u0E04\u0E23\u0E07\u0E0A\u0E38\u0E14", desc: "\u0E42\u0E04\u0E23\u0E07\u0E0A\u0E38\u0E14\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E25\u0E2D\u0E07\u0E42\u0E04\u0E23\u0E07\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48 1", icon: "\u{1F457}", badgeColor: "#A855F7" },
  FIRST_FITTING_DONE: { label: "\u0E25\u0E2D\u0E07\u0E42\u0E04\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22", desc: "\u0E1B\u0E23\u0E31\u0E1A\u0E41\u0E01\u0E49\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E32\u0E21\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E25\u0E2D\u0E07\u0E42\u0E04\u0E23\u0E07\u0E0A\u0E38\u0E14", icon: "\u2728", badgeColor: "#A855F7" },
  SECOND_FITTING_READY: { label: "\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E25\u0E2D\u0E07\u0E40\u0E01\u0E47\u0E1A\u0E17\u0E23\u0E07", desc: "\u0E0A\u0E38\u0E14\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E25\u0E2D\u0E07\u0E40\u0E01\u0E47\u0E1A\u0E17\u0E23\u0E07\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48 2", icon: "\u{1F457}", badgeColor: "#A855F7" },
  SECOND_FITTING_DONE: { label: "\u0E25\u0E2D\u0E07\u0E40\u0E01\u0E47\u0E1A\u0E17\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22", desc: "\u0E1B\u0E23\u0E31\u0E1A\u0E41\u0E15\u0E48\u0E07\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E23\u0E2D\u0E1A\u0E2A\u0E38\u0E14\u0E17\u0E49\u0E32\u0E22\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E01\u0E47\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", icon: "\u2728", badgeColor: "#A855F7" },
  EMBROIDERY: { label: "\u0E07\u0E32\u0E19\u0E1B\u0E31\u0E01/\u0E25\u0E39\u0E01\u0E44\u0E21\u0E49", desc: "\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E07\u0E32\u0E19\u0E1B\u0E31\u0E01 \u0E1B\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E04\u0E23\u0E34\u0E2A\u0E15\u0E31\u0E25 \u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E34\u0E14\u0E25\u0E39\u0E01\u0E44\u0E21\u0E49", icon: "\u{1FAA1}", badgeColor: "#EC4899" },
  HAND_FINISHING: { label: "\u0E2A\u0E2D\u0E22\u0E21\u0E37\u0E2D/\u0E40\u0E01\u0E47\u0E1A\u0E23\u0E34\u0E21", desc: "\u0E40\u0E01\u0E47\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E14\u0E49\u0E27\u0E22\u0E21\u0E37\u0E2D\u0E41\u0E25\u0E30\u0E07\u0E32\u0E19\u0E1D\u0E35\u0E21\u0E37\u0E2D\u0E1B\u0E23\u0E30\u0E13\u0E35\u0E15", icon: "\u{1FAA1}", badgeColor: "#EC4899" },
  FITTING: { label: "5. \u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E1F\u0E34\u0E15\u0E15\u0E34\u0E49\u0E07", desc: "\u0E19\u0E31\u0E14\u0E2B\u0E21\u0E32\u0E22\u0E25\u0E2D\u0E07\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E1B\u0E23\u0E31\u0E1A\u0E41\u0E15\u0E48\u0E07\u0E17\u0E23\u0E07\u0E15\u0E32\u0E21\u0E23\u0E39\u0E1B\u0E23\u0E48\u0E32\u0E07", icon: "\u{1F457}", badgeColor: "#A855F7" },
  ALTERING: { label: "\u0E1B\u0E23\u0E31\u0E1A\u0E41\u0E01\u0E49\u0E17\u0E23\u0E07", desc: "\u0E0A\u0E48\u0E32\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E31\u0E1A\u0E41\u0E01\u0E49\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E19\u0E31\u0E14\u0E1F\u0E34\u0E15\u0E15\u0E34\u0E49\u0E07", icon: "\u2702\uFE0F", badgeColor: "#F97316" },
  VERIFY_DETAILS: { label: "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", desc: "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E02\u0E2D\u0E07\u0E41\u0E1A\u0E1A\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19", icon: "\u{1F50D}", badgeColor: "#06B6D4" },
  QUALITY_CHECK: { label: "\u0E15\u0E23\u0E27\u0E08\u0E40\u0E0A\u0E47\u0E01\u0E04\u0E38\u0E13\u0E20\u0E32\u0E1E (QC)", desc: "\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E1B\u0E23\u0E30\u0E13\u0E35\u0E15\u0E02\u0E2D\u0E07\u0E15\u0E30\u0E40\u0E02\u0E47\u0E1A \u0E0B\u0E34\u0E1B \u0E41\u0E25\u0E30\u0E17\u0E23\u0E07\u0E0A\u0E38\u0E14", icon: "\u{1F50D}", badgeColor: "#06B6D4" },
  IRONING_PACKING: { label: "\u0E23\u0E35\u0E14\u0E2D\u0E31\u0E14\u0E41\u0E25\u0E30\u0E41\u0E1E\u0E47\u0E01\u0E0A\u0E38\u0E14", desc: "\u0E23\u0E35\u0E14\u0E44\u0E2D\u0E19\u0E49\u0E33\u0E08\u0E31\u0E14\u0E17\u0E23\u0E07\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E41\u0E1E\u0E47\u0E01\u0E43\u0E2A\u0E48\u0E16\u0E38\u0E07\u0E04\u0E25\u0E38\u0E21\u0E40\u0E2A\u0E37\u0E49\u0E2D\u0E1C\u0E49\u0E32", icon: "\u{1F454}", badgeColor: "#14B8A6" },
  READY: { label: "6. \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A/\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14", desc: "\u0E0A\u0E38\u0E14\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C 100% \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E19\u0E31\u0E14\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14\u0E2B\u0E23\u0E37\u0E2D\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07", icon: "\u{1F389}", badgeColor: "#10B981" },
  SHIPPED: { label: "\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07\u0E1E\u0E31\u0E2A\u0E14\u0E38\u0E41\u0E25\u0E49\u0E27", desc: "\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07\u0E1C\u0E48\u0E32\u0E19\u0E1A\u0E23\u0E34\u0E29\u0E31\u0E17\u0E02\u0E19\u0E2A\u0E48\u0E07\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u{1F69A}", badgeColor: "#10B981" },
  DELIVERED: { label: "\u0E1E\u0E31\u0E2A\u0E14\u0E38\u0E16\u0E36\u0E07\u0E1C\u0E39\u0E49\u0E23\u0E31\u0E1A\u0E41\u0E25\u0E49\u0E27", desc: "\u0E1E\u0E31\u0E2A\u0E14\u0E38\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07\u0E16\u0E36\u0E07\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u{1F4EC}", badgeColor: "#10B981" },
  COMPLETED: { label: "7. \u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u{1F389}", desc: "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E40\u0E0B\u0E47\u0E19\u0E23\u0E31\u0E1A\u0E21\u0E2D\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u{1F3C6}", badgeColor: "#059669" },
  CANCELLED: { label: "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C", desc: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01", icon: "\u274C", badgeColor: "#EF4444" },
  // Thai Legacy Aliases
  "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A": { label: "4. \u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A", desc: "\u0E0A\u0E48\u0E32\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E02\u0E36\u0E49\u0E19\u0E42\u0E04\u0E23\u0E07\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E40\u0E01\u0E47\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", icon: "\u{1FAA1}", badgeColor: "#F59E0B" },
  "\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A": { label: "4. \u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A", desc: "\u0E0A\u0E48\u0E32\u0E07\u0E01\u0E33\u0E25\u0E31\u0E07\u0E40\u0E22\u0E47\u0E1A\u0E02\u0E36\u0E49\u0E19\u0E42\u0E04\u0E23\u0E07\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E40\u0E01\u0E47\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14", icon: "\u{1FAA1}", badgeColor: "#F59E0B" },
  "\u0E23\u0E31\u0E1A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C": { label: "1. \u0E23\u0E31\u0E1A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22", desc: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E40\u0E02\u0E49\u0E32\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u{1F4CB}", badgeColor: "#3B82F6" },
  "\u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A": { label: "2. \u0E2A\u0E23\u0E38\u0E1B\u0E41\u0E1A\u0E1A/\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E1C\u0E49\u0E32", desc: "\u0E27\u0E32\u0E07\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19 \u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A \u0E41\u0E25\u0E30\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E1C\u0E49\u0E32\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A", icon: "\u270F\uFE0F", badgeColor: "#6366F1" },
  "\u0E15\u0E31\u0E14\u0E1C\u0E49\u0E32": { label: "3. \u0E02\u0E36\u0E49\u0E19\u0E41\u0E1A\u0E1A\u0E41\u0E25\u0E30\u0E15\u0E31\u0E14\u0E1C\u0E49\u0E32", desc: "\u0E0A\u0E48\u0E32\u0E07\u0E15\u0E31\u0E14\u0E1C\u0E49\u0E32\u0E15\u0E32\u0E21\u0E41\u0E1E\u0E17\u0E40\u0E17\u0E34\u0E23\u0E4C\u0E19\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u2702\uFE0F", badgeColor: "#F59E0B" },
  "\u0E1F\u0E34\u0E15\u0E15\u0E34\u0E49\u0E07": { label: "5. \u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E1F\u0E34\u0E15\u0E15\u0E34\u0E49\u0E07", desc: "\u0E19\u0E31\u0E14\u0E2B\u0E21\u0E32\u0E22\u0E25\u0E2D\u0E07\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E1B\u0E23\u0E31\u0E1A\u0E41\u0E15\u0E48\u0E07\u0E17\u0E23\u0E07\u0E15\u0E32\u0E21\u0E23\u0E39\u0E1B\u0E23\u0E48\u0E32\u0E07", icon: "\u{1F457}", badgeColor: "#A855F7" },
  "\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A": { label: "6. \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A/\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14", desc: "\u0E0A\u0E38\u0E14\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C 100% \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E19\u0E31\u0E14\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14\u0E2B\u0E23\u0E37\u0E2D\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07", icon: "\u{1F389}", badgeColor: "#10B981" },
  "\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08": { label: "7. \u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u{1F389}", desc: "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E15\u0E23\u0E27\u0E08\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14\u0E41\u0E25\u0E30\u0E40\u0E0B\u0E47\u0E19\u0E23\u0E31\u0E1A\u0E21\u0E2D\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27", icon: "\u{1F3C6}", badgeColor: "#059669" }
};
function getStatusDetails(status) {
  if (!status) {
    return { label: "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23", desc: "\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E01\u0E32\u0E23\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A", icon: "\u23F3", badgeColor: "#64748B" };
  }
  const clean = status.trim();
  if (STATUS_MAP_TH[clean]) {
    return STATUS_MAP_TH[clean];
  }
  const upper = clean.toUpperCase();
  if (STATUS_MAP_TH[upper]) {
    return STATUS_MAP_TH[upper];
  }
  return { label: clean, desc: "\u0E2D\u0E22\u0E39\u0E48\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E01\u0E32\u0E23\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A", icon: "\u23F3", badgeColor: "#64748B" };
}
function cleanCustomerQuery(q) {
  if (!q) return "";
  let res = q.trim();
  const prefixes = [
    "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E48\u0E30",
    "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E23\u0E31\u0E1A",
    "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35",
    "\u0E2B\u0E27\u0E31\u0E14\u0E14\u0E35\u0E04\u0E48\u0E30",
    "\u0E2B\u0E27\u0E31\u0E14\u0E14\u0E35\u0E04\u0E23\u0E31\u0E1A",
    "\u0E2B\u0E27\u0E31\u0E14\u0E14\u0E35",
    "\u0E02\u0E2D\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E04\u0E48\u0E30",
    "\u0E02\u0E2D\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E04\u0E23\u0E31\u0E1A",
    "\u0E02\u0E2D\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21",
    "\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E04\u0E48\u0E30",
    "\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E04\u0E23\u0E31\u0E1A",
    "\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E04\u0E48\u0E30",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E04\u0E23\u0E31\u0E1A",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04\u0E2A\u0E16\u0E32\u0E19\u0E30",
    "\u0E40\u0E0A\u0E47\u0E04\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E04\u0E48\u0E30",
    "\u0E40\u0E0A\u0E47\u0E04\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E04\u0E23\u0E31\u0E1A",
    "\u0E40\u0E0A\u0E47\u0E04\u0E2A\u0E16\u0E32\u0E19\u0E30",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04\u0E0A\u0E38\u0E14\u0E04\u0E48\u0E30",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04\u0E0A\u0E38\u0E14\u0E04\u0E23\u0E31\u0E1A",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04\u0E0A\u0E38\u0E14",
    "\u0E40\u0E0A\u0E47\u0E04\u0E0A\u0E38\u0E14\u0E04\u0E48\u0E30",
    "\u0E40\u0E0A\u0E47\u0E04\u0E0A\u0E38\u0E14\u0E04\u0E23\u0E31\u0E1A",
    "\u0E40\u0E0A\u0E47\u0E04\u0E0A\u0E38\u0E14",
    "\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E30",
    "\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E0A\u0E38\u0E14",
    "\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C",
    "\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21",
    "\u0E02\u0E2D\u0E40\u0E0A\u0E47\u0E04",
    "\u0E02\u0E2D\u0E14\u0E39\u0E2A\u0E16\u0E32\u0E19\u0E30",
    "\u0E02\u0E2D\u0E14\u0E39\u0E0A\u0E38\u0E14",
    "\u0E02\u0E2D\u0E14\u0E39",
    "\u0E14\u0E39\u0E2A\u0E16\u0E32\u0E19\u0E30",
    "\u0E14\u0E39\u0E0A\u0E38\u0E14",
    "\u0E40\u0E0A\u0E47\u0E04\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C",
    "\u0E40\u0E0A\u0E47\u0E04",
    "\u0E0A\u0E38\u0E14\u0E02\u0E2D\u0E07",
    "\u0E0A\u0E38\u0E14\u0E04\u0E38\u0E13",
    "\u0E0A\u0E38\u0E14",
    "\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E02\u0E2D\u0E07",
    "\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E04\u0E38\u0E13",
    "\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C",
    "\u0E02\u0E2D\u0E07",
    "\u0E04\u0E38\u0E13",
    "\u0E19\u0E32\u0E07\u0E2A\u0E32\u0E27",
    "\u0E19.\u0E2A.",
    "\u0E19\u0E32\u0E07",
    "\u0E19\u0E32\u0E22",
    "\u0E14.\u0E0D.",
    "\u0E14.\u0E0A.",
    "\u0E1E\u0E35\u0E48",
    "\u0E19\u0E49\u0E2D\u0E07",
    "\u0E0A\u0E48\u0E32\u0E07",
    "\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32",
    "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C",
    "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23",
    "\u0E40\u0E1A\u0E2D\u0E23\u0E4C",
    "\u0E42\u0E17\u0E23"
  ];
  const suffixes = [
    "\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13\u0E04\u0E48\u0E30",
    "\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13\u0E04\u0E23\u0E31\u0E1A",
    "\u0E19\u0E30\u0E04\u0E30",
    "\u0E19\u0E30\u0E04\u0E48\u0E30",
    "\u0E2B\u0E19\u0E48\u0E2D\u0E22\u0E04\u0E48\u0E30",
    "\u0E2B\u0E19\u0E48\u0E2D\u0E22\u0E04\u0E23\u0E31\u0E1A",
    "\u0E2B\u0E19\u0E48\u0E2D\u0E22",
    "\u0E14\u0E49\u0E27\u0E22\u0E04\u0E48\u0E30",
    "\u0E14\u0E49\u0E27\u0E22\u0E04\u0E23\u0E31\u0E1A",
    "\u0E04\u0E48\u0E30",
    "\u0E04\u0E30",
    "\u0E04\u0E23\u0E31\u0E1A",
    "\u0E08\u0E49\u0E32",
    "\u0E08\u0E4A\u0E30",
    "\u0E44\u0E2B\u0E21\u0E04\u0E30",
    "\u0E21\u0E31\u0E49\u0E22\u0E04\u0E30",
    "\u0E44\u0E2B\u0E21\u0E04\u0E23\u0E31\u0E1A",
    "\u0E21\u0E31\u0E49\u0E22\u0E04\u0E23\u0E31\u0E1A"
  ];
  let changed = true;
  let loops = 0;
  while (changed && loops < 10) {
    loops++;
    changed = false;
    res = res.trim();
    for (const p of prefixes) {
      if (res.startsWith(p)) {
        res = res.slice(p.length).trim();
        changed = true;
      }
    }
    for (const s of suffixes) {
      if (res.endsWith(s)) {
        res = res.slice(0, -s.length).trim();
        changed = true;
      }
    }
  }
  return res.trim();
}
function smartMatchOrders(inputText, ordersList, senderUserId) {
  if (!inputText || !ordersList || ordersList.length === 0) return [];
  const raw = inputText.trim();
  const lower = raw.toLowerCase();
  const digitsOnly = lower.replace(/\D/g, "");
  const phoneCandidates = [];
  const phoneMatches = raw.match(/(?:0|\+?66)[0-9\s-]{8,14}/g) || [];
  for (const m of phoneMatches) {
    const d = m.replace(/\D/g, "");
    const normalized = d.startsWith("66") ? "0" + d.slice(2) : d;
    if (normalized.length >= 9 && normalized.length <= 10) {
      phoneCandidates.push(normalized);
    }
  }
  if (digitsOnly.length >= 9 && digitsOnly.length <= 10) {
    const norm = digitsOnly.startsWith("66") ? "0" + digitsOnly.slice(2) : digitsOnly;
    if (!phoneCandidates.includes(norm)) phoneCandidates.push(norm);
  }
  const orderNumCandidates = [];
  const nuMatches = raw.match(/NU-?\s*\d{3,6}/gi) || [];
  for (const m of nuMatches) {
    orderNumCandidates.push(m.replace(/[- \s]/g, "").toLowerCase());
  }
  const pureDigitsMatch = raw.match(/\b\d{4,6}\b/g) || [];
  for (const pd of pureDigitsMatch) {
    orderNumCandidates.push(pd);
    orderNumCandidates.push("nu" + pd);
  }
  const cleanSearch = lower.replace(/[- \s\t\n()#_]/g, "");
  const strippedText = cleanCustomerQuery(raw).toLowerCase();
  const strippedClean = strippedText.replace(/[- \s\t\n()#_]/g, "");
  const matched = ordersList.filter((order) => {
    if (!order) return false;
    const orderPhone = (order.customerPhone || "").replace(/\D/g, "");
    const orderNum = (order.orderNumber || "").replace(/[- \s]/g, "").toLowerCase();
    const orderNumDigits = orderNum.replace(/\D/g, "");
    const name = (order.customerName || "").toLowerCase();
    const nameNoTitle = name.replace(/^(คุณ|นางสาว|น\.ส\.|นาง|นาย|ด\.ญ\.|ด\.ช\.|พี่|น้อง|ช่าง|ลูกค้า)\s*/i, "").trim();
    const nameNoSpaces = nameNoTitle.replace(/[- \s\t\n]/g, "");
    const nickname = (order.customerNickname || "").toLowerCase().trim();
    const lineUid = (order.lineUserId || "").toLowerCase().trim();
    if (senderUserId && lineUid && lineUid === senderUserId.toLowerCase().trim()) {
      return true;
    }
    for (const pc of phoneCandidates) {
      if (orderPhone && (orderPhone === pc || orderPhone.includes(pc) || pc.includes(orderPhone))) {
        return true;
      }
    }
    if (digitsOnly.length >= 7 && orderPhone && (orderPhone.includes(digitsOnly) || digitsOnly.includes(orderPhone))) {
      return true;
    }
    for (const onc of orderNumCandidates) {
      if (orderNum && (orderNum === onc || orderNum.includes(onc) || onc.includes(orderNum))) return true;
      if (orderNumDigits && onc.includes(orderNumDigits)) return true;
    }
    if (nameNoSpaces.length >= 2 && cleanSearch.includes(nameNoSpaces)) return true;
    if (nameNoTitle.length >= 2 && lower.includes(nameNoTitle)) return true;
    const nameParts = nameNoTitle.split(/\s+/).filter((p) => p.length >= 2);
    for (const part of nameParts) {
      const cleanPart = part.replace(/[- \s\t\n]/g, "");
      if (cleanPart.length >= 2 && (cleanSearch.includes(cleanPart) || strippedClean.includes(cleanPart))) {
        return true;
      }
    }
    if (strippedClean.length >= 2 && nameNoSpaces.includes(strippedClean)) return true;
    if (strippedText.length >= 2 && nameNoTitle.includes(strippedText)) return true;
    if (nickname.length >= 2) {
      if (cleanSearch.includes(nickname) || lower.includes(nickname) || strippedClean.includes(nickname)) {
        return true;
      }
    }
    return false;
  });
  return matched.sort((a, b) => {
    return (b.orderNumber || "").localeCompare(a.orderNumber || "", void 0, { numeric: true });
  });
}
function formatThaiDate(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch (_) {
    return dateStr;
  }
}
function formatSingleOrderLineMessage(order, baseAppUrl, userId) {
  const stCfg = getStatusDetails(order.status);
  const formattedDelivery = formatThaiDate(order.deliveryDate);
  const price = Number(order.price || 0);
  const deposit = Number(order.deposit || 0);
  const discount = Number(order.discount || 0);
  const finalPaid = Number(order.finalPaymentAmount || 0);
  const unpaid = Math.max(0, price - deposit - discount - finalPaid);
  const cleanBase = (baseAppUrl || "").replace(/\/+$/, "");
  const searchParam = encodeURIComponent(order.customerPhone || order.orderNumber);
  const userParam = userId ? `&lineUserId=${encodeURIComponent(userId)}` : "";
  const portalUrl = `${cleanBase}/?mode=customer&search=${searchParam}${userParam}`;
  return `\u269C\uFE0F \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E0A\u0E38\u0E14\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14 NUNUH Boutique \u269C\uFE0F

\u{1F464} \u0E40\u0E23\u0E35\u0E22\u0E19\u0E04\u0E38\u0E13: ${order.customerName}${order.customerNickname ? ` (${order.customerNickname})` : ""}
\u{1F9FE} \u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C: ${order.orderNumber}
\u{1F457} \u0E41\u0E1A\u0E1A\u0E0A\u0E38\u0E14: ${order.dressType}
\u{1F9F5} \u0E0A\u0E19\u0E34\u0E14\u0E1C\u0E49\u0E32/\u0E2A\u0E35: ${order.fabricType || "\u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38"} (${order.fabricColor || "-"})
` + (order.tailorName ? `\u2702\uFE0F \u0E0A\u0E48\u0E32\u0E07\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A: ${order.tailorName}

` : `
`) + `\u{1F4CD} \u0E2A\u0E16\u0E32\u0E19\u0E30 Real-Time: ${stCfg.icon} [${stCfg.label}]
\u2139\uFE0F \u0E02\u0E31\u0E49\u0E19\u0E15\u0E2D\u0E19\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19: "${stCfg.desc}"
\u{1F4C5} \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E2A\u0E16\u0E32\u0E19\u0E30: ${formatThaiDate(order.statusDate || order.orderDate)}
\u23F3 \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A\u0E0A\u0E38\u0E14: ${formattedDelivery}

\u{1F4B0} \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19:
\u2022 \u0E23\u0E32\u0E04\u0E32\u0E23\u0E27\u0E21: ${price.toLocaleString()} \u0E1A\u0E32\u0E17
\u2022 \u0E0A\u0E33\u0E23\u0E30\u0E21\u0E31\u0E14\u0E08\u0E33\u0E41\u0E25\u0E49\u0E27: ${deposit.toLocaleString()} \u0E1A\u0E32\u0E17
` + (unpaid === 0 ? `\u2022 \u0E2A\u0E16\u0E32\u0E19\u0E30\u0E0A\u0E33\u0E23\u0E30: \u0E0A\u0E33\u0E23\u0E30\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19\u0E41\u0E25\u0E49\u0E27 \u2713

` : `\u2022 \u0E22\u0E2D\u0E14\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E27\u0E31\u0E19\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14: ${unpaid.toLocaleString()} \u0E1A\u0E32\u0E17

`) + `\u{1F517} \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14 \u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19\u0E17\u0E35\u0E48\u0E27\u0E31\u0E14 \u0E41\u0E25\u0E30\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E41\u0E1A\u0E1A Real-Time \u0E15\u0E25\u0E2D\u0E14 24 \u0E0A\u0E21.:
${portalUrl}

\u0E2B\u0E32\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E2A\u0E2D\u0E1A\u0E16\u0E32\u0E21\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21 \u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E17\u0E34\u0E49\u0E07\u0E44\u0E27\u0E49\u0E43\u0E19\u0E41\u0E0A\u0E17\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49\u0E40\u0E25\u0E22\u0E19\u0E30\u0E04\u0E30 \u2728`;
}
function formatMultipleOrdersLineMessage(matchedOrders, baseAppUrl, userId) {
  const customerName = matchedOrders[0]?.customerName || "\u0E04\u0E38\u0E13\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32";
  const customerNickname = matchedOrders[0]?.customerNickname ? ` (${matchedOrders[0]?.customerNickname})` : "";
  let totalPrice = 0;
  let totalDeposit = 0;
  let totalUnpaid = 0;
  let itemsText = "";
  matchedOrders.forEach((order, idx) => {
    const stCfg = getStatusDetails(order.status);
    const delDate = formatThaiDate(order.deliveryDate);
    const price = Number(order.price || 0);
    const deposit = Number(order.deposit || 0);
    const discount = Number(order.discount || 0);
    const finalPaid = Number(order.finalPaymentAmount || 0);
    const unpaid = Math.max(0, price - deposit - discount - finalPaid);
    totalPrice += price;
    totalDeposit += deposit;
    totalUnpaid += unpaid;
    itemsText += `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`;
    itemsText += `\u{1F457} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48 ${idx + 1}: ${order.orderNumber} - ${order.dressType}
`;
    itemsText += `\u2022 \u0E1C\u0E49\u0E32/\u0E2A\u0E35: ${order.fabricType || "\u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38"} (${order.fabricColor || "-"})
`;
    itemsText += `\u2022 \u0E2A\u0E16\u0E32\u0E19\u0E30: ${stCfg.icon} [${stCfg.label}]
`;
    itemsText += `  \u21B3 "${stCfg.desc}"
`;
    itemsText += `\u2022 \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E48\u0E07\u0E21\u0E2D\u0E1A: ${delDate}
`;
    itemsText += `\u2022 \u0E23\u0E32\u0E04\u0E32: ${price.toLocaleString()} \u0E1A. | \u0E21\u0E31\u0E14\u0E08\u0E33: ${deposit.toLocaleString()} \u0E1A. | \u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D: ${unpaid.toLocaleString()} \u0E1A.
`;
  });
  const cleanBase = (baseAppUrl || "").replace(/\/+$/, "");
  const searchParam = encodeURIComponent(matchedOrders[0].customerPhone || matchedOrders[0].orderNumber);
  const userParam = userId ? `&lineUserId=${encodeURIComponent(userId)}` : "";
  const portalUrl = `${cleanBase}/?mode=customer&search=${searchParam}${userParam}`;
  return `\u269C\uFE0F NUNUH Boutique - \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 \u269C\uFE0F

\u{1F464} \u0E40\u0E23\u0E35\u0E22\u0E19\u0E04\u0E38\u0E13: ${customerName}${customerNickname}
\u{1F4E6} \u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 ${matchedOrders.length} \u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C \u0E14\u0E31\u0E07\u0E19\u0E35\u0E49\u0E04\u0E48\u0E30:

${itemsText}\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\u{1F4CA} \u0E2A\u0E23\u0E38\u0E1B\u0E22\u0E2D\u0E14\u0E23\u0E27\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 (${matchedOrders.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23):
\u2022 \u0E23\u0E27\u0E21\u0E21\u0E39\u0E25\u0E04\u0E48\u0E32\u0E0A\u0E38\u0E14: ${totalPrice.toLocaleString()} \u0E1A\u0E32\u0E17
\u2022 \u0E0A\u0E33\u0E23\u0E30\u0E21\u0E31\u0E14\u0E08\u0E33\u0E23\u0E27\u0E21: ${totalDeposit.toLocaleString()} \u0E1A\u0E32\u0E17
` + (totalUnpaid === 0 ? `\u2022 \u0E2A\u0E16\u0E32\u0E19\u0E30\u0E0A\u0E33\u0E23\u0E30: \u0E0A\u0E33\u0E23\u0E30\u0E04\u0E23\u0E1A\u0E16\u0E49\u0E27\u0E19\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E41\u0E25\u0E49\u0E27 \u2713

` : `\u2022 \u0E22\u0E2D\u0E14\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E2A\u0E38\u0E17\u0E18\u0E34\u0E27\u0E31\u0E19\u0E23\u0E31\u0E1A\u0E0A\u0E38\u0E14: ${totalUnpaid.toLocaleString()} \u0E1A\u0E32\u0E17

`) + `\u{1F517} \u0E40\u0E1B\u0E34\u0E14\u0E14\u0E39\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14 \u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19 \u0E23\u0E39\u0E1B\u0E20\u0E32\u0E1E\u0E41\u0E1A\u0E1A\u0E0A\u0E38\u0E14 \u0E41\u0E25\u0E30\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E17\u0E38\u0E01\u0E0A\u0E38\u0E14\u0E41\u0E1A\u0E1A Real-Time \u0E44\u0E14\u0E49\u0E17\u0E35\u0E48\u0E19\u0E35\u0E48\u0E04\u0E48\u0E30:
${portalUrl}

\u0E02\u0E2D\u0E1A\u0E1E\u0E23\u0E30\u0E04\u0E38\u0E13\u0E17\u0E35\u0E48\u0E44\u0E27\u0E49\u0E27\u0E32\u0E07\u0E43\u0E08\u0E43\u0E2B\u0E49\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E2A\u0E37\u0E49\u0E2D NUNUH \u0E14\u0E39\u0E41\u0E25\u0E0A\u0E38\u0E14\u0E2A\u0E27\u0E22\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E04\u0E48\u0E30 \u{1F496}\u2728`;
}
function formatCustomerOrdersReport(matchedOrders, baseAppUrl, userId) {
  if (!matchedOrders || matchedOrders.length === 0) return "";
  if (matchedOrders.length === 1) {
    return formatSingleOrderLineMessage(matchedOrders[0], baseAppUrl, userId);
  }
  return formatMultipleOrdersLineMessage(matchedOrders, baseAppUrl, userId);
}
function buildOrdersLineFlexMessage(matchedOrders, baseAppUrl, userId) {
  if (!matchedOrders || matchedOrders.length === 0) return null;
  const cleanBase = (baseAppUrl || "").replace(/\/+$/, "");
  const searchParam = encodeURIComponent(matchedOrders[0].customerPhone || matchedOrders[0].orderNumber);
  const userParam = userId ? `&lineUserId=${encodeURIComponent(userId)}` : "";
  const portalUrl = `${cleanBase}/?mode=customer&search=${searchParam}${userParam}`;
  const bubbles = matchedOrders.slice(0, 10).map((order, idx) => {
    const stCfg = getStatusDetails(order.status);
    const delDate = formatThaiDate(order.deliveryDate);
    const price = Number(order.price || 0);
    const deposit = Number(order.deposit || 0);
    const discount = Number(order.discount || 0);
    const finalPaid = Number(order.finalPaymentAmount || 0);
    const unpaid = Math.max(0, price - deposit - discount - finalPaid);
    const singleOrderUrl = `${cleanBase}/?mode=customer&search=${encodeURIComponent(order.orderNumber)}${userParam}`;
    return {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#211C1A",
        paddingAll: "14px",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "\u269C\uFE0F NUNUH BOUTIQUE",
                weight: "bold",
                color: "#D4AF37",
                size: "xs",
                flex: 1
              },
              {
                type: "text",
                text: matchedOrders.length > 1 ? `#${idx + 1} \u0E08\u0E32\u0E01 ${matchedOrders.length}` : "\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14",
                color: "#E2D9D0",
                size: "xxs",
                align: "end"
              }
            ]
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: order.orderNumber || "NU-ORDER",
                weight: "bold",
                size: "lg",
                color: "#211C1A",
                flex: 1
              },
              {
                type: "box",
                layout: "horizontal",
                backgroundColor: stCfg.badgeColor,
                cornerRadius: "8px",
                paddingStart: "8px",
                paddingEnd: "8px",
                paddingTop: "2px",
                paddingBottom: "2px",
                contents: [
                  {
                    type: "text",
                    text: stCfg.label.split(". ")[1] || stCfg.label,
                    color: "#FFFFFF",
                    size: "xxs",
                    weight: "bold"
                  }
                ]
              }
            ]
          },
          {
            type: "text",
            text: order.dressType || "\u0E0A\u0E38\u0E14\u0E2A\u0E31\u0E48\u0E07\u0E15\u0E31\u0E14\u0E1E\u0E34\u0E40\u0E28\u0E29",
            weight: "bold",
            size: "sm",
            color: "#8B5E3C",
            wrap: true
          },
          {
            type: "separator",
            margin: "sm",
            color: "#F0EAE1"
          },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "\u{1F464} \u0E25\u0E39\u0E01\u0E04\u0E49\u0E32", size: "xxs", color: "#8E8882", width: "70px" },
                  { type: "text", text: order.customerName || "-", size: "xxs", color: "#211C1A", weight: "bold", wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "\u{1F9F5} \u0E0A\u0E19\u0E34\u0E14\u0E1C\u0E49\u0E32", size: "xxs", color: "#8E8882", width: "70px" },
                  { type: "text", text: `${order.fabricType || "-"} (${order.fabricColor || "-"})`, size: "xxs", color: "#211C1A", wrap: true }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "\u23F3 \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E2A\u0E48\u0E07", size: "xxs", color: "#8E8882", width: "70px" },
                  { type: "text", text: delDate, size: "xxs", color: "#D97706", weight: "bold" }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "\u{1F4B0} \u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19", size: "xxs", color: "#8E8882", width: "70px" },
                  {
                    type: "text",
                    text: unpaid === 0 ? "\u0E0A\u0E33\u0E23\u0E30\u0E04\u0E23\u0E1A\u0E41\u0E25\u0E49\u0E27 \u2713" : `\u0E04\u0E07\u0E40\u0E2B\u0E25\u0E37\u0E2D ${unpaid.toLocaleString()} \u0E1A.`,
                    size: "xxs",
                    color: unpaid === 0 ? "#059669" : "#DC2626",
                    weight: "bold"
                  }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        spacing: "xs",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#8B5E3C",
            height: "sm",
            action: {
              type: "uri",
              label: "\u{1F50D} \u0E14\u0E39\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19 & \u0E15\u0E34\u0E14\u0E15\u0E32\u0E21 Real-Time",
              uri: singleOrderUrl
            }
          }
        ]
      }
    };
  });
  if (bubbles.length === 1) {
    return {
      type: "flex",
      altText: `\u269C\uFE0F \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C ${matchedOrders[0].orderNumber} (${matchedOrders[0].dressType})`,
      contents: bubbles[0]
    };
  }
  return {
    type: "flex",
    altText: `\u269C\uFE0F \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 ${matchedOrders.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 (NUNUH Boutique)`,
    contents: {
      type: "carousel",
      contents: bubbles
    }
  };
}
function formatOrderNotFoundMessage(originalText) {
  return `\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E48\u0E30\u0E04\u0E38\u0E13\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32 \u269C\uFE0F NUNUH Boutique \u269C\uFE0F \u0E22\u0E34\u0E19\u0E14\u0E35\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E04\u0E48\u0E30

\u274C \u0E02\u0E2D\u0E2D\u0E20\u0E31\u0E22\u0E04\u0E48\u0E30 \u0E23\u0E30\u0E1A\u0E1A\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E17\u0E35\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A "${originalText}"

\u{1F4CC} \u0E27\u0E34\u0E18\u0E35\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34:
\u2022 \u0E1E\u0E34\u0E21\u0E1E\u0E4C \u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C \u0E17\u0E35\u0E48\u0E41\u0E08\u0E49\u0E07\u0E44\u0E27\u0E49\u0E15\u0E2D\u0E19\u0E27\u0E31\u0E14\u0E15\u0E31\u0E27 (\u0E40\u0E0A\u0E48\u0E19 0801462230 \u0E2B\u0E23\u0E37\u0E2D 086-555-1234)
\u2022 \u0E2B\u0E23\u0E37\u0E2D\u0E1E\u0E34\u0E21\u0E1E\u0E4C \u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25 \u0E02\u0E2D\u0E07\u0E17\u0E48\u0E32\u0E19
\u2022 \u0E2B\u0E23\u0E37\u0E2D\u0E1E\u0E34\u0E21\u0E1E\u0E4C \u0E23\u0E2B\u0E31\u0E2A\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C (\u0E40\u0E0A\u0E48\u0E19 NU-26002 \u0E2B\u0E23\u0E37\u0E2D 26002)

\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E25\u0E30\u0E2A\u0E48\u0E07\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 \u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E07\u0E32\u0E19\u0E43\u0E2B\u0E49\u0E17\u0E48\u0E32\u0E19\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E31\u0E14\u0E2A\u0E48\u0E27\u0E19 \u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E04\u0E37\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E1A\u0E1A Real-Time \u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35\u0E15\u0E25\u0E2D\u0E14 24 \u0E0A\u0E21. \u0E40\u0E25\u0E22\u0E19\u0E30\u0E04\u0E30 \u2728`;
}

// api/webhook/line.ts
async function fetchOrdersFromFirestore() {
  try {
    const res = await fetch("https://firestore.googleapis.com/v1/projects/nuhpre-order/databases/(default)/documents/orders");
    if (!res.ok) return [];
    const data = await res.json();
    const parseFields = (fields) => {
      const resObj = {};
      for (const [k, v] of Object.entries(fields || {})) {
        const valObj = v;
        if ("stringValue" in valObj) resObj[k] = valObj.stringValue;
        else if ("integerValue" in valObj) resObj[k] = parseInt(valObj.integerValue, 10);
        else if ("doubleValue" in valObj) resObj[k] = parseFloat(valObj.doubleValue);
        else if ("booleanValue" in valObj) resObj[k] = valObj.booleanValue;
        else if ("arrayValue" in valObj) resObj[k] = (valObj.arrayValue.values || []).map((x) => Object.values(x)[0]);
        else if ("mapValue" in valObj) resObj[k] = parseFields(valObj.mapValue.fields);
      }
      return resObj;
    };
    return (data.documents || []).map((doc) => ({
      id: doc.name.split("/").pop(),
      ...parseFields(doc.fields)
    }));
  } catch (e) {
    console.warn("[Vercel Webhook] Firestore fetch failed:", e);
    return [];
  }
}
function readOrdersFromFile() {
  try {
    const p = path.join(process.cwd(), "orders.json");
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    }
  } catch (e) {
  }
  return [];
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-line-signature");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      message: "NUNUH LINE Webhook endpoint is active and ready.",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  try {
    const LINE_CHANNEL_ACCESS_TOKEN = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim();
    const LINE_CHANNEL_SECRET = (process.env.LINE_CHANNEL_SECRET || "").trim();
    const signature = req.headers["x-line-signature"];
    const body = req.body || {};
    const bodyString = typeof body === "string" ? body : JSON.stringify(body);
    if (LINE_CHANNEL_SECRET && signature && bodyString) {
      try {
        const hash = crypto.createHmac("SHA256", LINE_CHANNEL_SECRET).update(bodyString).digest("base64");
        if (hash !== signature) {
          console.warn("[Vercel LINE Webhook] Signature mismatch warning");
        }
      } catch (e) {
      }
    }
    const events = typeof body === "object" && Array.isArray(body.events) ? body.events : [];
    if (events.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Webhook verification verified successfully by LINE platform."
      });
    }
    const host = req.headers["x-forwarded-host"] || req.headers.host || "to-do-list-two-lovat.vercel.app";
    const proto = req.headers["x-forwarded-proto"] || "https";
    const baseAppUrl = `${proto}://${host}`.replace(/\/+$/, "");
    let allOrders = await fetchOrdersFromFirestore();
    if (!allOrders || allOrders.length === 0) {
      allOrders = readOrdersFromFile();
    }
    for (const event of events) {
      if (event.type === "message" && event.message?.type === "text") {
        const replyToken = event.replyToken;
        const originalText = (event.message.text || "").trim();
        const userId = event.source?.userId;
        console.log(`[Vercel Webhook] Received user message: "${originalText}" from userId: ${userId}`);
        const matchedOrders = smartMatchOrders(originalText, allOrders, userId);
        let replyMessage = "";
        let flexObj = null;
        if (matchedOrders.length === 0) {
          const digits = originalText.replace(/\D/g, "");
          const isLikelySearch = digits.length >= 7 || /NU-?\d{3,6}/i.test(originalText);
          if (isLikelySearch) {
            replyMessage = formatOrderNotFoundMessage(originalText);
          } else {
            replyMessage = `\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E48\u0E30\u0E04\u0E38\u0E13\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32 \u269C\uFE0F NUNUH Boutique \u269C\uFE0F \u0E22\u0E34\u0E19\u0E14\u0E35\u0E43\u0E2B\u0E49\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E04\u0E48\u0E30

\u0E04\u0E38\u0E13\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C (\u0E40\u0E0A\u0E48\u0E19 0801462230) \u0E2B\u0E23\u0E37\u0E2D\u0E0A\u0E37\u0E48\u0E2D \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E15\u0E34\u0E14\u0E15\u0E32\u0E21\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E2D\u0E2D\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E07\u0E32\u0E19\u0E15\u0E31\u0E14\u0E40\u0E22\u0E47\u0E1A\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35\u0E19\u0E30\u0E04\u0E30 \u2728`;
          }
        } else {
          replyMessage = formatCustomerOrdersReport(matchedOrders, baseAppUrl, userId);
          try {
            flexObj = buildOrdersLineFlexMessage(matchedOrders, baseAppUrl, userId);
          } catch (e) {
            console.warn("Error building flex message:", e);
          }
        }
        if (LINE_CHANNEL_ACCESS_TOKEN && replyToken) {
          const messagesPayload = [];
          if (flexObj) {
            messagesPayload.push(flexObj);
          }
          if (replyMessage) {
            messagesPayload.push({
              type: "text",
              text: replyMessage
            });
          }
          try {
            const lineReplyRes = await fetch("https://api.line.me/v2/bot/message/reply", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
              },
              body: JSON.stringify({
                replyToken,
                messages: messagesPayload.slice(0, 5)
                // LINE allows up to 5 messages per reply
              })
            });
            if (!lineReplyRes.ok) {
              const errBody = await lineReplyRes.text();
              console.error("[Vercel Webhook] LINE reply error:", errBody);
            } else {
              console.log(`[Vercel Webhook] Reply sent successfully to user for query "${originalText}".`);
            }
          } catch (replyErr) {
            console.error("[Vercel Webhook] Failed to fetch LINE reply API:", replyErr);
          }
        }
      }
    }
    return res.status(200).json({ status: "success", processed: events.length });
  } catch (err) {
    console.error("[Vercel Webhook Error]", err);
    return res.status(200).json({ status: "error_handled", error: err.message });
  }
}
export {
  handler as default
};
