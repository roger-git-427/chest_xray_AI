print(f"Train positives: {train_df['Cardiomegaly'].sum():.0f}")
print(f"Train negatives: {len(train_df) - train_df['Cardiomegaly'].sum():.0f}")
print(f"pos_weight: {(len(train_df) - train_df['Cardiomegaly'].sum()) / train_df['Cardiomegaly'].sum():.1f}")