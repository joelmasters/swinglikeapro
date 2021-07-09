import React from "react";
import PropTypes from "prop-types";
import Button from 'react-bootstrap/Button'

function YoutubeEmbed({ embedId }) {

  const playVideo = () => {
    
  }

  return (
    <div className="video-responsive">
      <iframe
        width="640"
        height="390"
        src={`https://www.youtube.com/embed/${embedId}?start=50&end=55`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Embedded youtube"
      />
      <Button onClick={playVideo}>Play</Button>
    </div>
)}

YoutubeEmbed.propTypes = {
  embedId: PropTypes.string.isRequired
};

export default YoutubeEmbed;