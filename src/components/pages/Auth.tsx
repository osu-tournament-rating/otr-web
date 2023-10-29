import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IAuthProps } from "./IAuthProps";

function Auth({ isAuthenticated, setIsAuthenticated, setAuthenticatedUser }: IAuthProps) {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const navigate = useNavigate();

  const apiUrl = process.env.REACT_APP_API_URL;
  const origin = process.env.REACT_APP_ORIGIN_URL;

  useEffect(() => {
    console.log("Logging in after osu! redirect");

    // make api call to login with code
    fetch(apiUrl + '/login?code=' + code, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": `${origin}`,
      },
    })
      .then((response) => {
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

    const origin = process.env.REACT_APP_ORIGIN_URL;
    fetch(apiUrl + "/me", {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": `${origin}`,
      }
    })
      .then((response) => response.json())
      .then((data) => {
        setAuthenticatedUser(data);
      })
      .catch((error) => {
        console.error("Error fetching authenticated user:", error);
      });

  }, [apiUrl, code, navigate, setIsAuthenticated, setAuthenticatedUser]);

  return (
    <>
      <p>Authorized</p>
    </>
  );
}

export default Auth;
