import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IAuthProps } from "./IAuthProps";

function Auth({ isAuthenticated, setIsAuthenticated }: IAuthProps) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const navigate = useNavigate();

  const apiLink = process.env.REACT_APP_API_URL;

  useEffect(() => {
    console.log("Logging in after osu! redirect");

    // make api call to login with code
    fetch(apiLink + '/login', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ code: code }),
    })
      .then((response) => {
        console.log(response);
        if (response.status !== 200) {
            throw new Error("Authorization failed!");
        }
        
        setIsAuthenticated(true);
        navigate("/", { replace: true });
      })
      .catch((error) => {
        console.error(error);
        setIsAuthenticated(false);
        return (
          <>
            <p>Authorization failed!</p>
          </>
        );
      });
  }, []);

  return (
    <>
      <p>Authorized</p>
    </>
  );
}

export default Auth;
