import React from 'react'
import { Component, Components, Utils } from 'react-dom-chunky'
import moment from 'moment'
import validator from 'validator'
import { LinearProgress } from 'rmwc/LinearProgress'
import { TextField, TextFieldIcon, TextFieldHelperText } from 'rmwc/TextField'
import {
  Card,
  CardMedia,
  CardMediaItem,
  CardPrimary,
  CardTitle,
  CardActions,
  CardActionButtons,
  CardAction,
  CardPrimaryAction,
  CardActionIcons,
  CardSubtitle,
  CardSupportingText,
  CardHorizontalBlock
} from 'rmwc/Card'
import { Button, ButtonIcon } from 'rmwc/Button'
import { Typography } from 'rmwc/Typography'
import { FormField } from 'rmwc/FormField'
import { Chip, ChipText, ChipIcon, ChipSet } from 'rmwc/Chip'
import {
  ListDivider
} from 'rmwc/List'
import { Fab } from 'rmwc/Fab'
import { Icon } from 'rmwc/Icon'
import { Slider } from 'rmwc/Slider'

const CoinMarketCapAPI = `https://api.coinmarketcap.com/v1/ticker/ethereum/?convert=USD`
const CarmelPrivateSaleAddress = `0x4E52e804905CC320BF631523a9cb1416B8d613Fb`

export default class LevelComponent extends Component {

  constructor (props) {
    super(props)
    this.state = { ...super.state, loading: true }
    this._installProvider = this.installProvider.bind(this)
    this._transactionDetails = this.transactionDetails.bind(this)
    this._incrementLevel = this.incrementLevel.bind(this)
    this._decrementLevel = this.decrementLevel.bind(this)
    this._updateLevel = this.updateLevel.bind(this)
    this._send = this.send.bind(this)
  }

  componentDidMount () {
    super.componentDidMount()
    this.startTimer()
    this.loadLevelData()
  }

  componentWillUnmount () {
    this.stopTimer()
  }

  startTimer () {
    const timer = setInterval(() => this.timerFired(), 1000)
    this.setState({ timer })
  }

  timerFired () {
    this.fetchProviderAccount(this.state.provider)
           .then((ethereumAddress) => {
             this.setState({ ethereumAddress })
           })
  }

  stopTimer () {
    if (!this.state.timer) {
      return
    }
    clearInterval(this.state.timer)
  }

  loadLevelData () {
    const provider = ((typeof web3 !== 'undefined') ? web3.currentProvider : undefined)
    const level = this.user.level || 0
    const tokens = this.user.tokens || 0
    const up = 10
    const nextLevel = (level + up)
    const nextTokens = (nextLevel * 1000)
    const loading = false
    const tokenPrice = 0.1

    return this.fetchEthereumRate()
               .then((ethereumRate) => {
                 const ethereumPrice = Number(ethereumRate.price_usd).toFixed(2)
                 const carmelPrice = (tokenPrice / ethereumPrice).toFixed(6)
                 const nextLevelPrice = (carmelPrice * (nextTokens - tokens)).toFixed(2)

                 return this.fetchProviderAccount(provider)
                            .then((ethereumAddress) => {
                              this.setState({
                                ethereumAddress,
                                tokenPrice,
                                nextLevelPrice,
                                ethereumPrice,
                                carmelPrice,
                                ethereumRate,
                                nextTokens,
                                nextLevel,
                                tokens,
                                up,
                                loading,
                                provider,
                                level })
                            })
               })
  }

  fetchProviderAccount (provider) {
    if (!provider) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      web3.eth.getAccounts((error, result) => {
        if (error || !result || result.length < 1) {
          resolve()
          return
        }
        resolve(result[0])
      })
    })
  }

  fetchEthereumRate () {
    return fetch(CoinMarketCapAPI)
            .then(response => response.json())
            .then(rates => rates[0])
  }

  calculateGas (to, data) {
    return new Promise((resolve, reject) => {
      web3.eth.estimateGas({ to, data }, (error, gas) => {
        if (error) {
          resolve(22000)
          return
        }
        resolve(gas)
      })
    })
  }

  sendEthereumTransaction (transaction) {
    return new Promise((resolve, reject) => {
      web3.eth.sendTransaction(transaction, (error, result) => {
        if (error) {
          reject(error)
          return
        }
        resolve(result)
      })
    })
  }

  sendEther (amount) {
    const message = `${(this.state.nextTokens - this.state.tokens).toLocaleString('en')} CARMEL (Period 1)`
    const data = web3.toHex(message)
    const from = this.state.ethereumAddress
    const to = CarmelPrivateSaleAddress
    const value = web3.toWei(amount, 'ether')

    return this.calculateGas(to, data)
               .then((gas) => this.sendEthereumTransaction({ from, to, value, data, gas }))
               .then((hash) => this.sendingEther(hash))
               .catch((error) => this.couldNotSendEther(error))
  }

  sendingEther (ethereumTransactionId) {
    this.props.onAction('upgrade', {
      ethereumTransactionId,
      ethereumAddress: this.state.ethereumAddress,
      total: this.state.nextLevelPrice,
      newLevel: this.state.nextLevel,
      currentLevel: this.state.level,
      currentTokens: this.state.tokens,
      newTokens: this.state.nextTokens,
      ethereumPrice: this.state.ethereumPrice,
      carmelPrice: this.state.carmelPrice
    })
  }

  couldNotSendEther (err) {
    this.setState({ sending: false, error: 'Could not send ether' })
  }

  send () {
    this.setState({ error: false, sending: true })
    this.sendEther(this.state.nextLevelPrice)
  }

  get providerInstallLink () {
    const name = this.props.browser.name.toLowerCase()
    switch (name) {
      case 'chrome':
        return 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn'
      default:
        return 'https://metamask.io'
    }
  }

  get user () {
    return this.props.account || {}
  }

  renderContentHeader () {
    return <div>
      <div style={{
        display: 'flex',
        flex: 1,
        justifyContent: 'center',
        padding: '10px',
        flexDirection: 'row',
        alignItems: 'center'}}>
        <Typography use='headline' tag='h1' style={{
          display: 'flex',
          flex: 1,
          justifyContent: 'flex-start'
        }}>
          <Icon style={{fontSize: '50px'}} strategy='ligature'>account_circle</Icon>
        </Typography>
        <Typography use='title' tag='h1' style={{
          display: 'flex',
          flex: 6,
          justifyContent: 'flex-start'
        }}>
          { this.user.name }
        </Typography>
        <Typography use='subheading1' tag='h1'>
          <ChipSet>
            <Chip style={{ backgroundColor: '#F5F5F5'}}>
              <ChipIcon style={{color: '#66BB6A'}} leading use={`stars`} />
              <ChipText> {this.state.tokens.toLocaleString('en')} CARMEL </ChipText>
            </Chip>
          </ChipSet>
          Level { this.state.level.toLocaleString('en') }
        </Typography>
      </div>
    </div>
  }

  renderReceipt () {
    if (!this.user.lastEthereumTransaction) {
      return <div />
    }

    return <div>
      <Button
        onClick={this._transactionDetails}
        style={{marginBottom: '30px'}}>
            Last Transaction Details </Button>

    </div>
  }

  renderWithProvider () {
    return <div>
      <Typography
        use='headline'
        tag='div'
        style={{padding: '0.5rem 1rem', textAlign: 'center', padding: '20px'}}
        theme='text-secondary-on-background'>
        Get CARMEL Tokens
      </Typography>
      <Typography
        style={{textAlign: 'center'}}
        use='subheading2'
        tag='div'>
        Period 1: February 26 - April 2 (90% Discount)
      </Typography>
      <ListDivider style={{marginBottom: '40px'}} />

      <Typography use='headline' tag='h1' style={{margin: '0px'}}>
        <ChipSet style={{justifyContent: 'center'}}>
          <Fab mini onClick={this._decrementLevel} style={{backgroundColor: '#CFD8DC', marginTop: '5px'}}>remove</Fab>
          <Chip style={{ backgroundColor: '#F5F5F5', marginLeft: '20px', marginRight: '20px', padding: '15px' }}>
            <ChipIcon style={{color: '#66BB6A', marginRight: '10px'}} leading use={`stars`} />
            <ChipText> {(this.state.nextTokens - this.state.tokens).toLocaleString('en')} CARMEL </ChipText>
          </Chip>
          <Fab mini onClick={this._incrementLevel} style={{marginTop: '5px'}}>add</Fab>
        </ChipSet>
      </Typography>
      <Slider
        style={{marginTop: '20px', marginBottom: '0px'}}
        value={this.state.up}
        onChange={this._updateLevel}
        discrete
        min={1}
        max={100}
        displayMarkers
        step={1} />

      <Typography use='caption' tag='h2' style={{margin: '5px'}}>
        This purchase increases your level of stake in Carmel to <strong> Level {this.state.nextLevel}</strong>.
      </Typography>

      <ListDivider style={{marginTop: '30px'}} />

      { this.renderPrice() }

    </div>
  }

  incrementLevel () {
    if (this.state.up === 100) {
      return
    }

    const up = this.state.up + 1
    const nextLevel = (this.state.level + up)
    const nextTokens = (nextLevel * 1000)
    const nextLevelPrice = (this.state.carmelPrice * (nextTokens - this.state.tokens)).toFixed(2)

    this.setState({ up, nextLevel, nextLevelPrice, nextTokens })
  }

  decrementLevel () {
    if (this.state.up === 1) {
      return
    }

    const up = this.state.up - 1
    const nextLevel = (this.state.level + up)
    const nextTokens = (nextLevel * 1000)
    const nextLevelPrice = (this.state.carmelPrice * (nextTokens - this.state.tokens)).toFixed(2)

    this.setState({ up, nextLevel, nextLevelPrice, nextTokens })
  }

  updateLevel (event) {
    const up = event.target.value
    const nextLevel = (this.state.level + up)
    const nextTokens = (nextLevel * 1000)
    const nextLevelPrice = (this.state.carmelPrice * (nextTokens - this.state.tokens)).toFixed(2)

    this.setState({ up, nextLevel, nextLevelPrice, nextTokens })
  }

  renderContentFooter () {
    return <div style={{
      display: 'flex',
      flex: 1,
      justifyContent: 'center',
      flexDirection: 'column',
      alignItems: 'center'}}>
      <Typography use='caption' tag='h1'>
        <ChipSet>
          <Chip style={{ backgroundColor: '#F5F5F5' }}>
            <ChipText> CARMEL: <strong> $0.10 USD = {this.state.carmelPrice} ETH </strong> </ChipText>
          </Chip>
          <Chip style={{ border: '1px #66BB6A solid', backgroundColor: '#ffffff', color: '#66BB6A' }}>
            <ChipText> <strong> 90% Discount </strong> </ChipText>
            <ChipIcon style={{color: '#66BB6A', marginLeft: '2px'}} leading use={`done`} />
          </Chip>
        </ChipSet>
      </Typography>
      <Typography use='caption' tag='h1'>
        At <a href='https://coinmarketcap.com/currencies/ethereum/'>CoinMarketCap ETH</a> rate: <strong>${ this.state.ethereumPrice.toLocaleString('en') } USD</strong>
      </Typography>
    </div>
  }

  renderLocked () {
    return <div>

      <Typography use='headline' tag='h1'>
        <Icon style={{fontSize: '50px'}} strategy='ligature'>lock</Icon>
      </Typography>

      <Typography use='headline' tag='h1'>
        MetaMask Is Locked
      </Typography>

      <ListDivider />

      <Typography use='caption' tag='h1'>
        Please unlock it in order to be able to Level Up
      </Typography>
    </div>
  }

  renderWithoutProvider () {
    if (this.state.provider) {
      return this.renderLocked()
    }

    return <div>
      <Typography use='headline' tag='h1'>
        MetaMask Is Required
      </Typography>
      <CardActions style={{justifyContent: 'center', margin: '20px'}}>
        <CardActionButtons>
          <Button
            onClick={this._installProvider}
            raised
            theme='secondary-bg text-primary-on-secondary'
            style={{margin: '20px'}}>
            Install Metamask </Button>
        </CardActionButtons>
      </CardActions>
      <Typography use='subheading2' tag='h1'>
        or unlock it if it is already installed
      </Typography>
    </div>
  }

  installProvider () {
    this.props.onAction('installProvider', { link: this.providerInstallLink })
  }

  transactionDetails () {
    this.props.onAction('transactionDetails', { link: `https://etherscan.io/tx/${this.user.lastEthereumTransaction}` })
  }

  renderPrice () {
    return <div>
      <CardActions style={{
        justifyContent: 'center',
        marginTop: '0px'}}>
        <CardActionButtons>
          <Button
            onClick={this._send}
            raised
            theme='secondary-bg text-primary-on-secondary'
            style={{margin: '20px'}}>
          Send {this.state.nextLevelPrice} ETH
          </Button>
        </CardActionButtons>
      </CardActions>
    </div>
  }

  renderMainContent () {
    return (this.state.ethereumAddress ? this.renderWithProvider() : this.renderWithoutProvider())
  }

  renderError () {
    if (!this.state.error) {
      return <div />
    }

    return (<div style={{ display: 'flex', flex: 1, margin: '10px', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }} >
      <Typography use='title' style={{color: '#ef5350'}} tag='h1'>
        { this.state.error }
      </Typography>
    </div>)
  }

  render () {
    const width = this.props.compact ? '95vw' : '600px'

    if (this.state.loading || this.state.sending) {
      return (<div style={{ display: 'flex', flex: 1, margin: '10px', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }} >
        <Card style={{width, margin: '20px', padding: '0px'}} >
          <Typography use='title' tag='h1'>
            { this.state.sending ? `Sending ... Just a sec.` : `Loading ... Just a sec.` }
          </Typography>
          <ListDivider />
          <LinearProgress determinate={false} />
        </Card>
      </div>)
    }

    return (<div style={{ display: 'flex', flex: 1, margin: '10px', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }} >
      <Card style={{width, margin: '10px', padding: '0px'}} >
        { this.renderContentHeader() }
      </Card>
      { this.renderReceipt() }
      { this.renderError() }
      <Card style={{width, margin: '0px', padding: '0px'}} >
        { this.renderMainContent() }
      </Card>
      { this.renderContentFooter() }
    </div>)
  }
}

const styles = {
  container: {
    margin: '20px'
  },
  toolbar: {
    paddingTop: '15px',
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'center',
    justifyContent: 'center'
  },
  title: {
    color: '#FFFFFF',
    fontSize: '18px',
    margin: '5px'
  },
  day: {
    color: '#FFFFFF',
    height: '60px',
    backgroundColor: '#6BBCF4',
    alignItems: 'flex-start'
  }
}

const errors = {
}
