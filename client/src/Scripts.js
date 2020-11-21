import React, { useEffect, useState } from "react";
import ScriptButton from "./ScriptButton";

const Scripts = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(undefined);
  const [scripts, setScripts] = useState(undefined);

  const loadScripts = async () => {
    setLoading(true);
    try {
      const payload = await fetch("/scripts");
      const newScripts = await payload.json();
      console.log(newScripts);
      setScripts(newScripts);
    } catch (e) {
      setError(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadScripts();
  }, []);

  if (error) {
    return (
      <div>
        An error occured. Please text Adam immediately and complain about bad
        engineering. This project has SLAs.
      </div>
    );
  }

  if (loading || !scripts) {
    return (
      <div>
        <i>loading... one day maybe</i>
      </div>
    );
  }

  return (
    <div>
      {Object.values(scripts).map((script) => (
        <ScriptButton key={script.name} {...script} />
      ))}
    </div>
  );
};

export default Scripts;
