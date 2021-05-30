import React, {useEffect, useState} from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import icon from './assets/icon.svg';
import './App.global.css';
import electron, {ipcRenderer} from 'electron';
import TrelloService from './services/TrelloService';
import ViewService from './services/ViewService';
import EventService from './services/EventService';
import fetch from 'node-fetch';
import { encode, decode } from 'js-base64';



const Hello = () => {
  const [emails, setEmails] = useState([]);
  const [test, setTest] = useState('test');


  useEffect(() => {

    ipcRenderer.on('gauth', async (event, authUrl) => {
      console.log("recieved: ", authUrl)
      window.open(authUrl, '_blank');

    });

    ipcRenderer.on('emails', async (event, res) => {
      console.log("emails",res)
      setEmails(res)
    });
    ipcRenderer.on('test', async (event, res) => {
      console.log("test",res)
    });


    ipcRenderer.on('context-menu:settings',()=>{
      console.log("context-menu:settings")
      setTest("context-menu:settings")
    })
  }, []);


  return (
    <div>
      <div>{test}</div>
      {
        emails.map((value, index) => {
          let html = decode(value.html)
          return (
            <div key={index} dangerouslySetInnerHTML={{ __html: html}}>
            </div>
          )
        })
      }
    </div>
  );
};

export default function App() {

  return (
    <Router>
      <Switch>
        <Route path="/" component={Hello} />
      </Switch>
    </Router>
  );
}
