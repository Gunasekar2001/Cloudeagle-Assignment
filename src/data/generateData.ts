import type { Employee, EmployeeStatus } from "../types";
import { DEPARTMENT_OPTIONS, STATUS_OPTIONS } from "./columns";

const FIRST_NAMES = [
  "Ava", "Liam", "Olivia", "Noah", "Emma", "Aiden", "Sophia", "Lucas", "Mia", "Ethan",
  "Isabella", "Mason", "Riya", "Arjun", "Priya", "Kabir", "Diya", "Vivaan", "Anika", "Reyansh",
  "Sara", "Ishaan", "Zoe", "Leo", "Maya", "Kian", "Nora", "Omar", "Lena", "Theo",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Patel", "Kim", "Garcia", "Nguyen", "Walsh", "Khan", "Silva", "Mehta",
  "Brown", "Davis", "Lopez", "Reddy", "Chen", "Ali", "Rao", "Singh", "Costa", "Park",
];

/** Deterministic pseudo-random generator (mulberry32) so the dataset is stable across reloads. */
function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rand: () => number, arr: readonly T[]): T =>
  arr[Math.floor(rand() * arr.length)];

/**
 * Generate a large, deterministic dataset of employees.
 * @param count number of rows (defaults to 10,000)
 */
export function generateEmployees(count = 10_000, seed = 42): Employee[] {
  const rand = mulberry32(seed);
  const rows: Employee[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const first = pick(rand, FIRST_NAMES);
    const last = pick(rand, LAST_NAMES);
    const name = `${first} ${last}`;
    const email = `${first}.${last}${i}`.toLowerCase() + "@example.com";

    rows[i] = {
      id: i + 1,
      name,
      email,
      department: pick(rand, DEPARTMENT_OPTIONS),
      status: pick(rand, STATUS_OPTIONS) as EmployeeStatus,
      salary: 40_000 + Math.floor(rand() * 160_000),
      quantity: 1 + Math.floor(rand() * 500),
      performance: Math.floor(rand() * 101),
    };
  }

  return rows;
}
