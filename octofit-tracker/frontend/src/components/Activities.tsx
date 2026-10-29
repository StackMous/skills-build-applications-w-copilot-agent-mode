import { FormEvent, useState } from 'react';
import { postJson } from '../api/client.js';
import { useApiResource } from '../api/resource.js';

type Activity = { _id?: string; type: string; minutes: number; points: number; occurredAt?: string };
type ActivitiesResponse = { activities: Activity[] };

export default function Activities() {
  const [reloadKey, setReloadKey] = useState(0);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const state = useApiResource<ActivitiesResponse>('/api/activities', 'activities', reloadKey);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setFormError('');
    setNotice('');
    const form = new FormData(formElement);
    try {
      await postJson('/api/activities', {
        userId: form.get('userId'),
        teamId: form.get('teamId'),
        type: form.get('type'),
        minutes: Number(form.get('minutes')),
      });
      formElement.reset();
      setNotice('Activity recorded.');
      setReloadKey((key) => key + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to record activity.');
    }
  }

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Activities</h2>
    <p>Track student activity minutes and points.</p>
    <form className="row g-2 mb-4" onSubmit={handleSubmit}>
      <div className="col-md-4"><label className="form-label" htmlFor="activity-user">User ID</label><input className="form-control" id="activity-user" name="userId" required /></div>
      <div className="col-md-4"><label className="form-label" htmlFor="activity-team">Team ID</label><input className="form-control" id="activity-team" name="teamId" required /></div>
      <div className="col-md-2"><label className="form-label" htmlFor="activity-type">Activity</label><input className="form-control" id="activity-type" name="type" required /></div>
      <div className="col-md-2"><label className="form-label" htmlFor="activity-minutes">Minutes</label><input className="form-control" id="activity-minutes" name="minutes" type="number" min="1" required /></div>
      <div className="col-12"><button className="btn btn-primary" type="submit">Record activity</button></div>
    </form>
    {notice && <p role="status">{notice}</p>}
    {formError && <p role="alert">{formError}</p>}
    {state.status === 'loading' && <p role="status">Loading activities...</p>}
    {state.status === 'error' && <p role="alert">{state.message}</p>}
    {state.status === 'success' && state.data.activities.length === 0 && <p>No activities yet.</p>}
    {state.status === 'success' && state.data.activities.length > 0 && <div className="table-responsive"><table className="table">
      <thead><tr><th scope="col">Activity</th><th scope="col">Minutes</th><th scope="col">Points</th><th scope="col">Recorded</th></tr></thead>
      <tbody>{state.data.activities.map((activity, index) => <tr key={activity._id ?? `${activity.type}-${index}`}>
        <td>{activity.type}</td><td>{activity.minutes}</td><td>{activity.points}</td><td>{activity.occurredAt ? new Date(activity.occurredAt).toLocaleDateString() : 'Recently'}</td>
      </tr>)}</tbody>
    </table></div>}
  </div></section>;
}
