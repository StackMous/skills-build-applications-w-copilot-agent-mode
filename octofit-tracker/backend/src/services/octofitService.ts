import { Activity, Team, User, Workout } from '../models/index.js';

function httpError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

function focusForActivity(type: string) {
  const normalized = type.toLowerCase();
  if (/run|cycl|walk|cardio|swim/.test(normalized)) return 'endurance';
  if (/strength|weight|resistance/.test(normalized)) return 'strength';
  return normalized;
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object') throw httpError('Activity details are required', 400);
  const data = input as Record<string, unknown>;
  const { userId, teamId, type, minutes } = data;
  if (!isObjectId(userId) || !isObjectId(teamId) || typeof type !== 'string' || !type.trim() || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw httpError('A valid user, team, activity type, and positive minutes value are required', 400);
  }

  const [user, team] = await Promise.all([User.findById(userId), Team.findById(teamId)]);
  if (!user || !team) throw httpError('The selected user or team does not exist', 404);

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object') throw httpError('Team details are required', 400);
  const data = input as Record<string, unknown>;
  const { name, mascot } = data;
  const members = data.members ?? [];
  if (typeof name !== 'string' || !name.trim()) throw httpError('A team name is required', 400);
  if (typeof mascot !== 'string' || !mascot.trim()) throw httpError('A team mascot is required', 400);
  if (!Array.isArray(members) || !members.every(isObjectId)) throw httpError('Team members must be valid user IDs', 400);

  if (members.length > 0) {
    const memberCount = await User.countDocuments({ _id: { $in: members } });
    if (memberCount !== new Set(members).size) throw httpError('One or more team members do not exist', 400);
  }

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    { $sort: { totalPoints: -1, _id: 1 } },
    { $lookup: { from: Team.collection.name, localField: '_id', foreignField: '_id', as: 'team' } },
    { $unwind: '$team' },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
  ]);

  return totals.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) throw httpError('No user was found for that email address', 404);

  const [recentActivity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const goal = user.fitnessGoal.toLowerCase();
  const recentFocus = recentActivity ? focusForActivity(recentActivity.type) : undefined;

  return workouts
    .map((workout) => {
      const focus = workout.focus.toLowerCase();
      const matchesGoal = focus === goal;
      const matchesActivity = recentFocus !== undefined && focus === recentFocus;
      const reason = matchesGoal
        ? `Recommended for your ${user.fitnessGoal} goal.`
        : matchesActivity
          ? `Matches your recent ${recentActivity?.type} activity.`
          : `A ${workout.focus} workout to support your training.`;
      return { ...workout, reason, score: (matchesGoal ? 2 : 0) + (matchesActivity ? 1 : 0) };
    })
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .map(({ score: _score, ...workout }) => workout);
}

export { User };
