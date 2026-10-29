/** The class's game across matches: one score per group, and who has played. */
export interface League {
  scores: readonly number[];
  played: readonly boolean[];
}

export type LeagueAction =
  | { type: "finishMatch"; group: number; points: number }
  | { type: "setGroups"; count: number }
  | { type: "setScore"; group: number; score: number }
  | { type: "reset" };

export interface GroupLimits {
  min: number;
  max: number;
}

export function initialLeague(count: number): League {
  return { scores: Array(count).fill(0), played: Array(count).fill(false) };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function reduceLeague(league: League, action: LeagueAction, limits: GroupLimits): League {
  switch (action.type) {
    case "finishMatch": {
      const { group, points } = action;
      if (!Number.isInteger(group) || group < 0 || group >= league.scores.length || !Number.isFinite(points) || points < 0) return league;
      return {
        scores: league.scores.map((score, i) => (i === group ? score + Math.round(points) : score)),
        played: league.played.map((played, i) => i === group || played),
      };
    }
    case "setGroups": {
      const count = clamp(Math.round(action.count), limits.min, limits.max);
      if (count === league.scores.length) return league;
      // Groups that stay keep their score; new groups start at zero.
      const resize = <T>(list: readonly T[], blank: T) => Array.from({ length: count }, (_, i) => list[i] ?? blank);
      return { ...league, scores: resize(league.scores, 0), played: resize(league.played, false) };
    }
    case "setScore": {
      if (action.group < 0 || action.group >= league.scores.length || !Number.isFinite(action.score)) return league;
      const score = Math.max(0, Math.round(action.score));
      if (score === league.scores[action.group]) return league;
      return { ...league, scores: league.scores.map((value, i) => (i === action.group ? score : value)) };
    }
    case "reset":
      return initialLeague(league.scores.length);
  }
}
