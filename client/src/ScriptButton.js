import React, { useState } from "react";

const ScriptButton = ({ name, color, rpc }) => {
  const [loading, setLoading] = useState(false);
  const onClick = async (e) => {
    e.preventDefault();
    if (!loading) {
      setLoading(true);
      await fetch("/push", {
        method: "POST",
        body: JSON.stringify({ rpc }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      setLoading(false);
    }
  };
  return (
    <button type="button" onClick={onClick} style={{ color }}>
      {loading ? "doing da thing,," : name}
    </button>
  );
};

export default ScriptButton;
