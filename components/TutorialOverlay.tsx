import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export interface TutorialStep {
  title: string;
  description: string | React.ReactNode;
  top?: DimensionValue;
  bottom?: DimensionValue;
  left?: DimensionValue;
  right?: DimensionValue;
  nextLabel?: string;
  onNextAction?: () => void;
  overlayColor?: string;
  arrow?: {
    direction: 'up' | 'down' | 'left' | 'right' | 'down-right';
    top?: DimensionValue;
    bottom?: DimensionValue;
    left?: DimensionValue;
    right?: DimensionValue;
    size?: number;
    scale?: number;
    scaleY?: number;
    scaleX?: number;
    length?: number;
  };
  scrollY?: number;
  spotlight?: {
    top?: DimensionValue;
    bottom?: DimensionValue;
    left?: DimensionValue;
    right?: DimensionValue;
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
  };
}

interface TutorialOverlayProps {
  isVisible: boolean;
  steps: TutorialStep[];
  onFinish: () => void;
  onExit: () => void;
  totalSteps?: number;
  stepOffset?: number;
  onStepChange?: (stepIndex: number) => void;
  currentStepIndex?: number;
  onStepIndexChange?: (stepIndex: number) => void;
  overlayColor?: string;
}

export default function TutorialOverlay({
  isVisible,
  steps,
  onFinish,
  onExit,
  totalSteps,
  stepOffset,
  onStepChange,
  currentStepIndex: controlledStepIndex,
  onStepIndexChange,
  overlayColor
}: TutorialOverlayProps) {
  const [internalStepIndex, setInternalStepIndex] = useState(0);

  const currentStepIndex = controlledStepIndex !== undefined ? controlledStepIndex : internalStepIndex;

  const updateStepIndex = (newIndexOrFn: number | ((prev: number) => number)) => {
    const nextIndex = typeof newIndexOrFn === 'function' ? newIndexOrFn(currentStepIndex) : newIndexOrFn;
    if (onStepIndexChange) {
      onStepIndexChange(nextIndex);
    }
    setInternalStepIndex(nextIndex);
  };

  const setCurrentStepIndex = updateStepIndex;

  useEffect(() => {
    if (isVisible) {
      onStepChange?.(currentStepIndex);
    }
  }, [currentStepIndex, isVisible, onStepChange]);

  if (!isVisible || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (currentStep.onNextAction) {
      currentStep.onNextAction();
      return;
    }
    if (isLastStep) {
      setCurrentStepIndex(0);
      onFinish();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleExit = () => {
    setCurrentStepIndex(0);
    onExit();
  };

  const isCentered = currentStep.top === undefined && currentStep.bottom === undefined;

  const cardPositionStyle: any = {
    left: currentStep.left,
    right: currentStep.right,
  };

  if (isCentered) {
    cardPositionStyle.top = '50%';
    cardPositionStyle.transform = [{ translateY: -140 }];
  } else {
    if (currentStep.top !== undefined) cardPositionStyle.top = currentStep.top;
    if (currentStep.bottom !== undefined) cardPositionStyle.bottom = currentStep.bottom;
  }

  const renderArrow = () => {
    if (!currentStep.arrow) return null;

    const { direction, top, bottom, left, right, size = 40, scale, scaleY, scaleX, length } = currentStep.arrow;
    
    let iconName: any = 'arrow-up';
    if (direction === 'down') iconName = 'arrow-down';
    if (direction === 'left') iconName = 'arrow-back';
    if (direction === 'right') iconName = 'arrow-forward';
    if (direction === 'down-right') iconName = 'arrow-forward';

    const arrowStyle: any = { position: 'absolute' };
    if (top !== undefined) arrowStyle.top = top;
    if (bottom !== undefined) arrowStyle.bottom = bottom;
    
    const transforms: any[] = [];
    if (direction === 'down-right') {
      transforms.push({ rotate: '45deg' });
    }
    if (scale !== undefined) {
      transforms.push({ scale });
    }

    const effectiveLength = length !== undefined ? length / size : undefined;
    const finalScaleY = scaleY ?? (direction === 'up' || direction === 'down' || direction === 'down-right' ? effectiveLength : undefined);
    const finalScaleX = scaleX ?? (direction === 'left' || direction === 'right' ? effectiveLength : undefined);

    if (finalScaleY !== undefined) {
      transforms.push({ scaleY: finalScaleY });
    }
    if (finalScaleX !== undefined) {
      transforms.push({ scaleX: finalScaleX });
    }

    if (transforms.length > 0) {
      arrowStyle.transform = transforms;
    }

    if (left !== undefined) {
      arrowStyle.left = left;
    } else if (right !== undefined) {
      arrowStyle.right = right;
    } else if (direction === 'up' || direction === 'down') {
      arrowStyle.alignSelf = 'center';
    }

    if (direction === 'left' || direction === 'right') {
       if (top === undefined && bottom === undefined) {
          arrowStyle.alignSelf = 'center';
       }
    }

    return (
      <View style={arrowStyle}>
        <Ionicons name={iconName} size={size} color="white" />
      </View>
    );
  };

  const totalDotsCount = totalSteps ?? steps.length;
  const activeDotIndex = (stepOffset ?? 0) + currentStepIndex;

  return (
    <View style={[styles.overlay, (currentStep.overlayColor || overlayColor) ? { backgroundColor: currentStep.overlayColor || overlayColor } : undefined]}>
      {currentStep.spotlight && (
        <View 
          style={[
            styles.spotlight, 
            {
              top: currentStep.spotlight.top,
              bottom: currentStep.spotlight.bottom,
              left: currentStep.spotlight.left,
              right: currentStep.spotlight.right,
              width: currentStep.spotlight.width,
              height: currentStep.spotlight.height,
              borderRadius: currentStep.spotlight.borderRadius ?? 8,
            }
          ]} 
        />
      )}
      <View style={[styles.card, cardPositionStyle]}>
        
        {renderArrow()}

        {/* Header */}
        <View style={styles.header}>
            <Text style={styles.title}>{currentStep.title}</Text>
            <TouchableOpacity onPress={handleExit} style={styles.exitButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
        </View>

        {/* Content */}
        {typeof currentStep.description === 'string' ? (
          <Text style={styles.description}>{currentStep.description}</Text>
        ) : (
          <View style={styles.descriptionContainer}>
            {currentStep.description}
          </View>
        )}

        {/* Indicators */}
        <View style={styles.indicatorContainer}>
          {Array.from({ length: totalDotsCount }).map((_, index) => (
            <React.Fragment key={index}>
              <View 
                style={[
                  styles.dot, 
                  index === activeDotIndex ? styles.activeDot : undefined
                ]} 
              />
            </React.Fragment>
          ))}
        </View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          {!isFirstStep ? (
            <TouchableOpacity onPress={handlePrev} style={[styles.navButton, styles.secondaryButton]}>
              <Text style={styles.secondaryButtonText}>Previous</Text>
            </TouchableOpacity>
          ) : <View style={{flex: 1}}/>}

          <TouchableOpacity onPress={handleNext} style={[styles.navButton, styles.primaryButton]}>
            <Text style={styles.primaryButtonText}>
              {currentStep.nextLabel ? currentStep.nextLabel : (isLastStep ? 'Finish' : 'Next')}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    zIndex: 1000,
    elevation: 10,
  },
  card: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: width * 0.85,
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  exitButton: {
      padding: 4,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#4A90E2',
    width: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  secondaryButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  spotlight: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
});
