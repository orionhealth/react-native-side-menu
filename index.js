// @flow

import React from 'react';
import {
  PanResponder,
  View,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  I18nManager,
} from 'react-native';
import PropTypes from 'prop-types';
import styles from './styles';

type WindowDimensions = { width: number, height: number };

type Props = {
  edgeHitWidth: number,
  toleranceX: number,
  toleranceY: number,
  menuPosition: 'left' | 'right' | 'start' | 'end',
  onChange: Function,
  onMove: Function,
  onSliding: Function,
  openMenuOffsetPercentage: number,
  hiddenMenuOffsetPercentage: number,
  disableGestures: Function | bool,
  animationFunction: Function,
  onAnimationComplete: Function,
  onStartShouldSetResponderCapture: Function,
  isOpen: bool,
  bounceBackOnOverdraw: bool,
  autoClosing: bool,
  visible: bool,
};

type Event = {
  nativeEvent: {
    layout: {
      width: number,
      height: number,
    },
  },
};

type State = {
  width: number,
  height: number,
  openOffsetMenuPercentage: number,
  openMenuOffset: number,
  hiddenMenuOffsetPercentage: number,
  hiddenMenuOffset: number,
  left: Animated.Value,
};

const deviceScreen: WindowDimensions = Dimensions.get('window');
const barrierForward: number = deviceScreen.width / 4;

function shouldOpenMenu(dx: number): boolean {
  return dx > barrierForward;
}

// returns `true` is menu is positioned `left` or `start`, false otherwise.
function isMenuPositionedAtStartOfViewport(menuPosition: string): boolean {
  return menuPosition === 'left' || menuPosition === 'start';
}

// return 1 multiplier if menu position is `start|left` AND
// LTR or `end|right` AND RTL, return -1 otherwise.
function menuPositionMultiplier(menuPosition) {
    const start = isMenuPositionedAtStartOfViewport(menuPosition);
    if ((start && !I18nManager.isRTL) || (!start && I18nManager.isRTL)) {
      return 1;
    } else {
      return -1;
    }
} 

export default class SideMenu extends React.Component {
  onLayoutChange: Function;
  onStartShouldSetResponderCapture: Function;
  onMoveShouldSetPanResponder: Function;
  onPanResponderMove: Function;
  onPanResponderRelease: Function;
  onPanResponderTerminate: Function;
  state: State;
  prevLeft: number;
  isOpen: boolean;

  constructor(props: Props) {
    super(props);

    this.prevLeft = 0;
    this.isOpen = !!props.isOpen;

    const initialMenuPositionMultiplier = menuPositionMultiplier(props.menuPosition);

    // Orion Fork Change: Calculate the offsets pixels from a percentage value, rather then using prop values.
    // This essentially reverses the logic which used to calculate percentages from pixesl.
    const { openMenuOffsetPercentage, hiddenMenuOffsetPercentage } = props;

    const openMenuOffset = (deviceScreen.width / 100) * openMenuOffsetPercentage;
    const hiddenMenuOffset = (deviceScreen.width / 100) * hiddenMenuOffsetPercentage;
    
    const left: Animated.Value = new Animated.Value(
      props.isOpen
        ? openMenuOffset * initialMenuPositionMultiplier
        : hiddenMenuOffset * initialMenuPositionMultiplier
    );

    this.onLayoutChange = this.onLayoutChange.bind(this);
    this.onStartShouldSetResponderCapture = props.onStartShouldSetResponderCapture.bind(this);
    this.onMoveShouldSetPanResponder = this.handleMoveShouldSetPanResponder.bind(this);
    this.onPanResponderMove = this.handlePanResponderMove.bind(this);
    this.onPanResponderRelease = this.handlePanResponderEnd.bind(this);
    this.onPanResponderTerminate = this.handlePanResponderEnd.bind(this);

    this.state = {
      width: deviceScreen.width,
      height: deviceScreen.height,
      openMenuOffsetPercentage,
      openMenuOffset,
      hiddenMenuOffsetPercentage,
      hiddenMenuOffset,
      left,
    };

    this.state.left.addListener(({value}) => this.props.onSliding(Math.abs((value - this.state.hiddenMenuOffset) / (this.state.openMenuOffset - this.state.hiddenMenuOffset))));
  }

  componentWillMount(): void {
    this.responder = PanResponder.create({
      onStartShouldSetResponderCapture: this.onStartShouldSetResponderCapture,
      onMoveShouldSetPanResponder: this.onMoveShouldSetPanResponder,
      onPanResponderMove: this.onPanResponderMove,
      onPanResponderRelease: this.onPanResponderRelease,
      onPanResponderTerminate: this.onPanResponderTerminate,
    });
  }

  componentWillReceiveProps(props: Props): void {
    if (typeof props.isOpen !== 'undefined' && this.isOpen !== props.isOpen && (props.autoClosing || this.isOpen === false)) {
      this.openMenu(props.isOpen);
    } else {
      // This below code is taken from an Open PR into React Native Side Menu.
      // See https://github.com/react-native-community/react-native-side-menu/pull/356/commits/89bb710a8a2458db4b8163c94d81d38fb9c95927
      // (Some further modifications have been done be Orion Health)
      const { openMenuOffsetPercentage, hiddenMenuOffsetPercentage } = props;
      // if openMenuOffset or hiddenMenuOffset has changed
      if ((this.props.openMenuOffsetPercentage !== openMenuOffsetPercentage) || (this.props.hiddenMenuOffsetPercentage !== hiddenMenuOffsetPercentage)) {
        const width = Dimensions.get('window').width;
        const openMenuOffset = (width / 100) * openMenuOffsetPercentage;
        const hiddenMenuOffset = (width / 100) * hiddenMenuOffsetPercentage;

        this.setState({
          ...this.state,
          openMenuOffsetPercentage,
          hiddenMenuOffsetPercentage,
          openMenuOffset, 
          hiddenMenuOffset,
          width,
        });
        this.moveLeft(this.isOpen ? openMenuOffset : hiddenMenuOffset);
      }
    }
  }

  onLayoutChange(e: Event) {
    // This below code is taken from an Open PR into React Native Side Menu.  
    // https://github.com/react-native-community/react-native-side-menu/pull/343/commits/1bf58bc701a560b3d5221dff762e6730641b16fd
    const sizes = e.nativeEvent.layout;
    this.changeOffset(sizes);
  }

  changeOffset = ({ width, height }) => {
    const { openMenuOffsetPercentage, hiddenMenuOffsetPercentage } = this.state;
    
    const openMenuOffset = (width / 100) * openMenuOffsetPercentage;
    const hiddenMenuOffset = (width / 100) * hiddenMenuOffsetPercentage;
    
    this.setState({
      width,
      height,
      openMenuOffset,
      hiddenMenuOffset,
      openMenuOffsetPercentage,
      hiddenMenuOffsetPercentage,
    });
    this.moveLeft(this.isOpen ? openMenuOffset : hiddenMenuOffset);
  }	

  /**
   * Get content view. This view will be rendered over menu
   * @return {React.Component}
   */
  getContentView() {
    let overlay: React.Element<void, void> = null;

    if (this.isOpen) {
      overlay = (
        <TouchableWithoutFeedback onPress={() => this.openMenu(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      );
    }

    const { visible } = this.props;
    const { width, height, left } = this.state; 
    const ref = sideMenu => (this.sideMenu = sideMenu);
    // If the drawer is not visible, then we dont want to render the animation styles.
    const style = visible ? [
      styles.frontView,
      this.props.animationStyle(left),
    ] : [styles.containerWhenNotVisible];
    return (
      <Animated.View style={style} ref={ref} {...this.responder.panHandlers}>
        {this.props.children}
        {/* overlay only when visible */}
        {visible && overlay}
      </Animated.View>
    );
  }

  moveLeft(offset: number) {
    const newOffset = menuPositionMultiplier(this.props.menuPosition) * offset;

    this.props
      .animationFunction(this.state.left, newOffset)
      .start(this.props.onAnimationComplete);

    this.prevLeft = newOffset;
  }

  handlePanResponderMove(e: Object, gestureState: Object) {
    if (this.state.left.__getValue() * menuPositionMultiplier(this.props.menuPosition) >= 0) {
      let newLeft = this.prevLeft + gestureState.dx;

      if (!this.props.bounceBackOnOverdraw && Math.abs(newLeft) > this.state.openMenuOffset) {
        newLeft = menuPositionMultiplier(this.props.menuPosition) * this.state.openMenuOffset;
      }

      this.props.onMove(newLeft);
      this.state.left.setValue(newLeft);
    }
  }

  handlePanResponderEnd(e: Object, gestureState: Object) {
    const offsetLeft = menuPositionMultiplier(this.props.menuPosition) *
      (this.state.left.__getValue() + gestureState.dx);

    this.openMenu(shouldOpenMenu(offsetLeft));
  }

  handleMoveShouldSetPanResponder(e: any, gestureState: any): boolean {
    if (this.gesturesAreEnabled()) {
      const x = Math.round(Math.abs(gestureState.dx));
      const y = Math.round(Math.abs(gestureState.dy));

      const touchMoved = x > this.props.toleranceX && y < this.props.toleranceY;

      if (this.isOpen) {
        return touchMoved;
      }

      const start = isMenuPositionedAtStartOfViewport(this.props.menuPosition);
      // If `right|end` OR `left|start` and RTL then calculate edgeHitWidth using screen width.
      const withinEdgeHitWidth = (!start || (start && I18nManager.isRTL)) ?
        gestureState.moveX > (this.state.width - this.props.edgeHitWidth) :
        gestureState.moveX < this.props.edgeHitWidth;

      const swipingToOpen = menuPositionMultiplier(this.props.menuPosition) * gestureState.dx > 0;
      return withinEdgeHitWidth && touchMoved && swipingToOpen;
    }

    return false;
  }

  openMenu(isOpen: boolean): void {
    const { hiddenMenuOffset, openMenuOffset } = this.state;
    this.moveLeft(isOpen ? openMenuOffset : hiddenMenuOffset);
    this.isOpen = isOpen;

    this.forceUpdate();
    this.props.onChange(isOpen);
  }

  gesturesAreEnabled(): boolean {
    const { disableGestures } = this.props;

    if (typeof disableGestures === 'function') {
      return !disableGestures();
    }

    return !disableGestures;
  }

  getBoundryStyleByDirection(): Object {
    const boundryEdge = this.state.width - this.state.openMenuOffset;
    const width = this.state.width - boundryEdge;
    const start = isMenuPositionedAtStartOfViewport(this.props.menuPosition);
    // If the RTL setting matches the menuPosition prop
    // value, then return start and end values which are 
    // responsive to RTL direction for menu boundry.
    if (start) {
      return { start: 0, end: boundryEdge, width: width };
    }
    else {
      return { end: 0, start: boundryEdge, width: width }; 
    }
  }

  render(): React.Element<void, void> {
    const { visible } = this.props;
    const boundryStyle = this.getBoundryStyleByDirection();

    const menu = (
      <View style={[styles.menu, boundryStyle]}>
        {this.props.menu}
      </View>
    );

    return (
      <View
        style={[visible && styles.containerWhenVisible, !visible && styles.containerWhenNotVisible]}
        onLayout={this.onLayoutChange}
      >
        {visible && menu}
        {this.getContentView()}
      </View>
    );
  }
}

SideMenu.propTypes = {
  edgeHitWidth: PropTypes.number,
  toleranceX: PropTypes.number,
  toleranceY: PropTypes.number,
  menuPosition: PropTypes.oneOf(['left', 'right', 'start', 'end']),
  onChange: PropTypes.func,
  onMove: PropTypes.func,
  children: PropTypes.node,
  menu: PropTypes.node,
  openMenuOffsetPercentage: PropTypes.number,
  hiddenMenuOffsetPercentage: PropTypes.number,
  animationStyle: PropTypes.func,
  disableGestures: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
  animationFunction: PropTypes.func,
  onAnimationComplete: PropTypes.func,
  onStartShouldSetResponderCapture: PropTypes.func,
  isOpen: PropTypes.bool,
  bounceBackOnOverdraw: PropTypes.bool,
  autoClosing: PropTypes.bool,
  visible: PropTypes.bool,
};

SideMenu.defaultProps = {
  toleranceY: 10,
  toleranceX: 10,
  edgeHitWidth: 60,
  children: null,
  menu: null,
  openMenuOffsetPercentage: 66,
  disableGestures: false,
  menuPosition: 'left',
  hiddenMenuOffset: 0,
  onMove: () => {},
  onStartShouldSetResponderCapture: () => true,
  onChange: () => {},
  onSliding: () => {},
  animationStyle: value => ({
    transform: [{
      translateX: value,
    }],
  }),
  animationFunction: (prop, value) => Animated.spring(prop, {
    toValue: value,
    friction: 8,
  }),
  onAnimationComplete: () => {},
  isOpen: false,
  bounceBackOnOverdraw: true,
  autoClosing: true,
  visible: true,
};