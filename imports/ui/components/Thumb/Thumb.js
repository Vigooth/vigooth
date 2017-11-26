import React from 'react';
import './Thumb.scss'
const fugitives = [
    {_id:1,src:"/mile.svg",title:"Milena Saggio",description:"Rechercher pour meurtre"},
    {_id:2,src:"/gauth.svg",title:"Gauthier Vigouroux",description:"Rechercher pour baron de la drogue"},
    {_id:3,src:"/trist.svg",title:"Tristan Bauer",description:"A violé plusieurs minettes"},
];
const judgments = () =>{
    const judgments = ["coupable", "innoncent"];
    return judgments.map( judgment => <li key={judgment} className="Thumb-judgment-item"><a>{judgment}</a></li>)
};

const Thumb = () => (
    fugitives.map( fugitive =>
  <div key={fugitive._id} className="Thumb">
    <div className="Thumb-img">
      <img className={"Thumb-img-item"} src={fugitive.src} />
    </div>
    <div className="Thumb-content">
      <h3 className="Thumb-title">{fugitive.title}</h3>
        <p className="Thumb-description">{fugitive.description}</p>
        <ul className="Thumb-judgment">
            {judgments()}
        </ul>
    </div>
  </div>
    )
);

export default Thumb;
