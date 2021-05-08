import { useState, useEffect } from "react"

const FLEET_STATUS_ENDPOINT = '/fleetStatus';
const SEND_TURTLE_MESSAGE_ENDPOINT = '/sendTurtleMessage';
const PREEMPT_TURTLE = '/preemptTurtle';

const aliases = {
    '↑': 'turtle.forward()',
    '↓': 'turtle.back()',
    '↶': 'turtle.turnLeft()',
    '↷': 'turtle.turnRight()',
    '⥣': 'turtle.up()',
    '⥥': 'turtle.down()',
    '⛏': 'turtle.mine()',
    '⚔': 'turtle.attack()',
}

function Turtle({ state }) {
    const [script, setScript] = useState("");

    async function runScript(script) {
        const body = {
            turtle: state.id,
            message: {
                type: "rsrc",
                src: script
            }
        }
        await fetch(SEND_TURTLE_MESSAGE_ENDPOINT, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify(body),
        })
    }

    async function preempt() {
        const body = {
            turtle: state.id,
        }
        await fetch(PREEMPT_TURTLE, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            method: "POST",
            body: JSON.stringify(body),
        })
    }

    return <div className="border">
        <h2>{state.name ? `${state.name}/${state.id}` : state.id}</h2>
        <div>
            <h3>State</h3>
            <p>Ready state: {state.readyState}</p>
            <button type="button" onClick={preempt}>preempt</button>
        </div>
        <div>
            <h3>Commands</h3>
            <div>
                {Object.entries(aliases).map(([aliasName, aliasValue]) =>
                    <button className="mono font-size-big" type="button" onClick={() => runScript(aliasValue)}>{aliasName}</button>)}
            </div>
        </div>
        <div>
            <h3>Scripting</h3>
            <textarea value={script} onChange={(e) => setScript(e.target.value)} />
            <button type="button" onClick={() => runScript(script)}>run script</button>
        </div>
    </div>
}

function Fleet() {
    const [fleetStatus, setFleetStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    async function getFleetStatus() {
        setError(false);
        setLoading(true);
        try {
            const res = await fetch(FLEET_STATUS_ENDPOINT)

            if (!res.ok) {
                setError('Error fetching fleet status')
            } else {
                const data = await res.json();
                setFleetStatus(data)
            }
        } catch (e) {
            console.error(e)
            setError('Error fetching fleet status')
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getFleetStatus()
    }, [])

    if (loading || !fleetStatus) {
        return <div>Loading...</div>
    }
    if (error) {
        return <div><p>{{ error }}</p> <button type="button" onClick={getFleetStatus}>retry</button></div>
    }

    const turtles = Object.values(fleetStatus);
    return <div>{turtles.map(turtle => <Turtle key={turtle.id} state={turtle} />)}</div>
}

export default Fleet