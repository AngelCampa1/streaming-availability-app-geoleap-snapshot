/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'react-window-infinite-loader' {
  import React, { ComponentType } from 'react';

  export interface InfiniteLoaderProps {
    isItemLoaded: (index: number) => boolean;
    itemCount: number;
    loadMoreItems: (startIndex: number, stopIndex: number) => Promise<void> | void;
    threshold?: number;
    children: (props: {
      onItemsRendered: (props: { startIndex: number; stopIndex: number }) => void;
      ref: (ref: any) => void;
    }) => React.ReactElement;
  }

  declare const InfiniteLoader: ComponentType<InfiniteLoaderProps>;
  export default InfiniteLoader;
}
