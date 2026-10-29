import { FormEvent, useState } from 'react';
import { getJson } from '../api/client.js';
import { useApiResource } from '../api/resource.js';

type Workout = { _id?: string; title: string; focus: string; minutes: number; difficulty: string; reason: string };
type WorkoutsResponse = { suggestions: Workout[] };

export default function Workouts() {
  const [email, setEmail] = useState('mona@example.com');
  const [requestedEmail, setRequestedEmail] = useState('mona@example.com');
  const state = useApiResource<WorkoutsResponse>(`/api/workouts/suggestions/${encodeURIComponent(requestedEmail)}`, 'workout suggestions', getJson<WorkoutsResponse>);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestedEmail(email.trim());
  }

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Workout suggestions</h2>
    <p>Recommend workouts from activity patterns.</p>
    <form className="row g-2 mb-4" onSubmit={handleSubmit}>
      <div className="col-md-8"><label className="form-label" htmlFor="workout-email">User email</label><input className="form-control" id="workout-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
      <div className="col-md-4 d-flex align-items-end"><button className="btn btn-primary" type="submit">Find workouts</button></div>
    </form>
    {state.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
    {state.status === 'error' && <p role="alert">{state.message}</p>}
    {state.status === 'success' && state.data.suggestions.length === 0 && <p>No workout suggestions yet.</p>}
    {state.status === 'success' && state.data.suggestions.length > 0 && <ul className="list-group">
      {state.data.suggestions.map((workout, index) => <li className="list-group-item" key={workout._id ?? `${workout.title}-${index}`}>
        <h3 className="h5">{workout.title}</h3><p className="mb-1">{workout.focus} | {workout.minutes} min | {workout.difficulty}</p><p className="mb-0">{workout.reason}</p>
      </li>)}
    </ul>}
  </div></section>;
}
