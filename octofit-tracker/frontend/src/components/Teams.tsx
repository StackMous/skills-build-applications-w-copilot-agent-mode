import { FormEvent, useState } from 'react';
import { getJson, postJson } from '../api/client.js';
import { useApiResource } from '../api/resource.js';

type Team = { _id?: string; name: string; mascot: string; members: string[] };
type TeamsResponse = { teams: Team[] };

export default function Teams() {
  const [reloadKey, setReloadKey] = useState(0);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const state = useApiResource<TeamsResponse>('/api/teams', 'teams', getJson<TeamsResponse>, reloadKey);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setFormError('');
    setNotice('');
    const form = new FormData(formElement);
    try {
      const members = String(form.get('members') ?? '').split(',').map((member) => member.trim()).filter(Boolean);
      await postJson('/api/teams', { name: form.get('name'), mascot: form.get('mascot'), members });
      formElement.reset();
      setNotice('Team created.');
      setReloadKey((key) => key + 1);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create team.');
    }
  }

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Teams</h2>
    <p>Manage teams and members.</p>
    <form className="row g-2 mb-4" onSubmit={handleSubmit}>
      <div className="col-md-5"><label className="form-label" htmlFor="team-name">Team name</label><input className="form-control" id="team-name" name="name" required /></div>
      <div className="col-md-5"><label className="form-label" htmlFor="team-mascot">Mascot</label><input className="form-control" id="team-mascot" name="mascot" required /></div>
      <div className="col-md-8"><label className="form-label" htmlFor="team-members">Member IDs</label><input className="form-control" id="team-members" name="members" /></div>
      <div className="col-md-4 d-flex align-items-end"><button className="btn btn-primary" type="submit">Create team</button></div>
    </form>
    {notice && <p role="status">{notice}</p>}
    {formError && <p role="alert">{formError}</p>}
    {state.status === 'loading' && <p role="status">Loading teams...</p>}
    {state.status === 'error' && <p role="alert">{state.message}</p>}
    {state.status === 'success' && state.data.teams.length === 0 && <p>No teams yet.</p>}
    {state.status === 'success' && state.data.teams.length > 0 && <div className="table-responsive"><table className="table">
      <thead><tr><th scope="col">Team</th><th scope="col">Mascot</th><th scope="col">Members</th></tr></thead>
      <tbody>{state.data.teams.map((team, index) => <tr key={team._id ?? `${team.name}-${index}`}>
        <td>{team.name}</td><td>{team.mascot}</td><td>{team.members.length}</td>
      </tr>)}</tbody>
    </table></div>}
  </div></section>;
}
