import "./loader.css";
import whiteLoader from "../images/whiteLoader.svg";
import orangeLoader from "../images/orangeLoader.svg";
import blueLoader from "../images/blueLoader.svg";

export default function Loader(props) {
  return (
    <div className="loaderContainer">
      <div className="loader">
        {props.color === "white" && <img src={whiteLoader} alt="loader" />}
        {props.color === "orange" && <img src={orangeLoader} alt="loader" />}
        {(!props.color || props.color === "blue") && (
          <img src={blueLoader} alt="loader" />
        )}
      </div>
    </div>
  );
}
