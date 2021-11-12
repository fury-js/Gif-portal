import { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { Connection, PublicKey, clusterApiUrl} from '@solana/web3.js';
import {
  Program, Provider, web3
} from '@project-serum/anchor';

import idle from './idle.json'
import kp from "./keypair.json"


// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.


// Get our program's id form the IDL file.
const programId = new PublicKey(idle.metadata.address)

// Set our network to devent
const network = clusterApiUrl("devnet")

// Control's how we want to acknowledge when a trasnaction is "done"
const opts = {
  preflightComitment: "processed"
}

const arr = Object.values(kp._keypair.secretKey)
console.log(arr)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;


const TEST_GIFS = 
[
  'https://media.giphy.com/media/PSO2JyPsPjxeZE1j3T/giphy.gif',
  "https://media.giphy.com/media/JQvUME2YOpTgqCKhDb/giphy-downsized-large.gif",
  "https://media.giphy.com/media/RdoLnYmwxQEwo18vmx/giphy.gif",
	'https://media.giphy.com/media/xT8qB92I2HlIO8reg0/giphy.gif'
]








const App = () => {
  // State
  const [walletAddress, setWalletAddress] = useState(null)
  const [inputValue, setInputValue] = useState("")
  const [gifList, setGifList] = useState([])

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if(solana) {
        if(solana.isPhantom) {
          console.log("Phantom wallet is Installed", solana)

        //   The solana object gives us a function that will allow us to connect
        //  *directly with the user's wallet!
        const response = await solana.connect({onlyIfTrusted: true })
        console.log('Phantom wallet connected with public key:', response.publicKey.toString())

        // Update the sate with the address
        setWalletAddress(response.publicKey.toString())
        }
      }else {
        alert("No solana object found, Get a phantom wallet")
      }
      
    } catch (error) {
      console.log(error)
    }
  }

  const connectWallet = async () => {
    try {
      const { solana } = window;

      if(solana) {
        const response = await solana.connect()

        console.log("Connected with public adress:", response.publicKey.toString())
        setWalletAddress(response.publicKey.toString())
      }
    } catch (error) {
      console.log(error)
      
    }
  }

  const sendGif =  async () => {
    if(inputValue.length > 0) {
      console.log("Gif Link", inputValue)

      const provider = getProvider()
      const program = new Program(idle, programId, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      })

      console.log("Successfully saved Gif to program:", inputValue)

      await getGifLists()

    } else {
      console.log("Empty Value try again")
    }
  }

  const onInputChange = (event) => {
    event.preventDefault()
    // const { value } = event.
    setInputValue(event.target.value)
  }

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightComitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightComitment
    );

    return provider;
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider()
      const program = new Program(idle, programId, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      })
      console.log("Program has Created a  New BaseAcoount with address:", baseAccount.publicKey.toString());
      await getGifLists();
      
    } catch (error) {
      console.log("Account Initialization failed:", error)
    }
  }

  const getGifLists = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idle, programId, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey)

      console.log("fetched account", account)
      setGifList(account.gifList)
    } catch (error) {
      console.log("Error getting the GIFS", error)
      setGifList(null)
    }
  }


  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"  
      onClick={connectWallet}
    >
      Connect Wallet
    </button>
  )

  const renderConnectedContainer = () => {
    // Control's how we want to acknowledge when a trasnaction is "done"
    if(gifList === null){
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
      // Otherwise, we're good! Account exists. User can submit GIFs
    } else {
      return (
        <div className="connected-container">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              sendGif()
            }} 
            
            >
            <input 
              type="text" 
              placeholder="Enter gif link!" 
              value={inputValue}
              onChange={onInputChange}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
            <div className="gif-grid">
              {gifList.map((item, index) => (
                <div className="gif-item" key={index}>
                  <img src={item.gifLink} alt={item }/>
                </div>
              ))}
            </div>
          </form>
    </div>
      )
      
    }

  }
    
  

  // When our component first mounts, let's check to see if we have a connected
  // Phantom Wallet
  // In React, the useEffect hook gets called once on component mount when that second parameter (the []) is empty! So, this is perfect for us. As soon as someone goes to our app, we can check to see if they have Phantom Wallet installed or not. This will be very important soon.
  // Currently, the Phantom Wallet team suggests to wait for the window to fully finish loading before checking for the solana object. Once this event gets called, we can guarantee that this object is available if the user has the Phantom Wallet extension installed.
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    // turn on event listener on component mount
    window.addEventListener("load", onLoad);

    return () => window.removeEventListener("load", onLoad)
    
  }, [])

  useEffect(() => {
    if(walletAddress) {
      console.log("fetching gifs")
      getGifLists();

    }
  }, [walletAddress])



  return (
    <div className={walletAddress ? "authed-container" : "container"}>
      <div className="App">
        <div className="container">
          <div className="header-container">
            <p className="header">🖼 Anime Portal</p>
            <p className="sub-text">
              View your Anime collection in the metaverse ✨
            </p>
            {!walletAddress && renderNotConnectedContainer()}
            {walletAddress && renderConnectedContainer()}
          </div>
          <div className="footer-container">
            <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
            <a
              className="footer-text"
              href={TWITTER_LINK}
              target="_blank"
              rel="noreferrer"
            >{`built on @${TWITTER_HANDLE}`}</a>
          </div>
        </div>
      </div>
    </div>
    
  );
};

export default App;
